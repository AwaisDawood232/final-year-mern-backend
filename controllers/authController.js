const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/userModel");
const sendEmail = require("../utils/sendEmail");
const emailTemplates = require("../utils/emailTemplates");
const keys = require("../config/keys");
const createError = require("../utils/appError");

// Create Google OAuth client
const googleClient = new OAuth2Client(keys.googleClientId);

// register
exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return next(new createError("Email already registered", 400));
    }

    // Create user
    user = await User.create({
      name,
      email,
      password,
    });

    // Generate verification token
    const verificationToken = user.getVerificationToken();
    await user.save({ validateBeforeSave: false });

    // Create verification URL
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
    console.log("Verification URL:", verificationUrl);

    // Send verification email
    try {
      const emailTemplate = emailTemplates.verificationEmailTemplate(
        user.name,
        verificationUrl
      );

      await sendEmail({
        to: user.email,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
      });

      res.status(201).json({
        success: true,
        message:
          "Registration successful. Please check your email to verify your account.",
      });
    } catch (err) {
      console.error("Email error:", err);

      // Reset verification fields
      user.verificationToken = undefined;
      user.verificationTokenExpire = undefined;
      await user.save({ validateBeforeSave: false });

      return next(new createError("Email could not be sent", 500));
    }
  } catch (err) {
    console.error("Registration error:", err);
    return next(new createError("Server error", 500));
  }
};

exports.verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;

    if (!token) {
      return next(new createError("Invalid verification token", 400));
    }

    // Hash token
    const verificationToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // Find user with matching token and not expired
    const user = await User.findOne({
      verificationToken,
      verificationTokenExpire: { $gt: Date.now() },
    });

    if (!user) {
      return next(
        new createError("Invalid or expired verification token", 400)
      );
    }

    // Activate account
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpire = undefined;
    await user.save();

    // Return JWT token
    sendTokenResponse(user, 200, res);
  } catch (err) {
    console.error("Email verification error:", err);
    return next(new createError("Server error", 500));
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return next(new createError("Please provide email and password", 400));
    }

    // Check for user
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return next(new createError("Invalid credentials", 401));
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return next(new createError("Invalid credentials", 401));
    }

    // Check if user has verified email
    if (!user.isVerified) {
      return next(new createError("Please verify your email to login", 401));
    }

    // Return JWT token
    sendTokenResponse(user, 200, res);
  } catch (err) {
    console.error("Login error:", err);
    return next();
  }
};

exports.googleSignIn = async (req, res, next) => {
  try {
    const { tokenId } = req.body;

    // Verify Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: tokenId,
      audience: keys.googleClientId,
    });

    const { name, email, picture, sub: googleId } = ticket.getPayload();

    // Check if user exists
    let user = await User.findOne({ email });

    if (user) {
      // Update Google ID if not already set
      if (!user.googleId) {
        user.googleId = googleId;
        user.avatar = picture || user.avatar;
        await user.save({ validateBeforeSave: false });
      }

      // If user exists but email not verified, verify it now
      if (!user.isVerified) {
        user.isVerified = true;
        await user.save({ validateBeforeSave: false });
      }
    } else {
      // Create new user
      const password = crypto.randomBytes(10).toString("hex");

      user = await User.create({
        name,
        email,
        password,
        googleId,
        avatar: picture,
        isVerified: true, // Auto-verify Google users
      });
    }

    // Return JWT token
    sendTokenResponse(user, 200, res);
  } catch (err) {
    console.error("Google sign-in error:", err);
    return next(new createError("Invalid Google token or server error", 500));
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return next(new createError("No user found with that email", 404));
    }

    // Get reset token
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    try {
      const emailTemplate = emailTemplates.resetPasswordTemplate(
        user.name,
        resetUrl
      );

      await sendEmail({
        to: user.email,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
      });

      res.status(200).json({
        success: true,
        message: "Password reset email sent",
      });
    } catch (err) {
      console.error("Password reset email error:", err);

      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });

      return next(new createError("Email could not be sent", 500));
    }
  } catch (err) {
    console.error("Forgot password error:", err);
    return next(new createError("Server error", 500));
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    // Get token from params
    const { token } = req.params;
    const { password } = req.body;

    // Hash token
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // Find user with matching token and not expired
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return next(new createError("Invalid or expired reset token", 400));
    }

    // Set new password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    // Return JWT token
    sendTokenResponse(user, 200, res);
  } catch (err) {
    console.error("Reset password error:", err);
    return next(new createError("Server error", 500));
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return next(new createError("User not found", 404));
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    console.error("Get current user error:", err);
    return next(new createError("Server error", 500));
  }
};

exports.resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return next(new createError("No user found with that email", 404));
    }

    // Check if already verified
    if (user.isVerified) {
      return next(new createError("Email already verified", 400));
    }

    // Generate verification token
    const verificationToken = user.getVerificationToken();
    await user.save({ validateBeforeSave: false });

    // Create verification URL
    const verificationUrl = `${keys.frontendUrl}/verify-email/${verificationToken}`;

    try {
      const emailTemplate = emailTemplates.verificationEmailTemplate(
        user.name,
        verificationUrl
      );

      await sendEmail({
        to: user.email,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
      });

      res.status(200).json({
        success: true,
        message: "Verification email resent",
      });
    } catch (err) {
      console.error("Resend verification email error:", err);

      // Reset verification fields
      user.verificationToken = undefined;
      user.verificationTokenExpire = undefined;
      await user.save({ validateBeforeSave: false });

      return next(new createError("Email could not be sent", 500));
    }
  } catch (err) {
    console.error("Resend verification error:", err);
    return next(new createError("Server error", 500));
  }
};

const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = user.getSignedJwtToken();

  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
    },
  });
};
