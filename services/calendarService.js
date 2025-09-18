const ical = require('ical-generator');
const nodemailer = require('nodemailer');
const { format } = require('date-fns');
const { utcToZonedTime } = require('date-fns-tz');

// Create nodemailer transporter (configure with your email service)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASSWORD || 'your-app-password',
  },
});

// Generate ICS calendar file
const generateICS = (session, organizer, attendee) => {
  const calendar = ical({
    prodId: { company: 'SkillSwap', product: 'SkillSwap Calendar' },
    name: 'SkillSwap Session',
    timezone: session.timezone || 'UTC',
  });

  const event = calendar.createEvent({
    start: session.startTime,
    end: session.endTime,
    summary: session.title,
    description: session.description || 'Skill exchange session',
    location: session.location.type === 'online'
      ? session.location.meetingLink || 'Online Meeting'
      : session.location.details || 'TBD',
    organizer: {
      name: organizer.name,
      email: organizer.email,
    },
    attendees: [
      {
        name: attendee.name,
        email: attendee.email,
        rsvp: true,
        status: 'NEEDS-ACTION',
      },
    ],
    status: 'CONFIRMED',
    busyStatus: 'BUSY',
    created: new Date(),
    lastModified: new Date(),
  });

  // Add reminders
  if (session.reminders && session.reminders.length > 0) {
    session.reminders.forEach(reminder => {
      event.createAlarm({
        type: 'display',
        trigger: reminder.time * 60, // Convert minutes to seconds
        description: `Reminder: ${session.title}`,
      });
    });
  }

  return calendar.toString();
};

// Send calendar invite via email
const sendCalendarInvite = async (session, organizer, attendee, type = 'create') => {
  const icsContent = generateICS(session, organizer, attendee);

  const emailSubject = {
    create: `New Session Scheduled: ${session.title}`,
    update: `Session Updated: ${session.title}`,
    cancel: `Session Cancelled: ${session.title}`,
  };

  const emailBody = {
    create: `
      <h2>New Skill Exchange Session Scheduled!</h2>
      <p>Hi ${attendee.name},</p>
      <p>${organizer.name} has scheduled a skill exchange session with you.</p>

      <h3>Session Details:</h3>
      <ul>
        <li><strong>Title:</strong> ${session.title}</li>
        <li><strong>Date:</strong> ${format(new Date(session.startTime), 'PPP')}</li>
        <li><strong>Time:</strong> ${format(new Date(session.startTime), 'p')} - ${format(new Date(session.endTime), 'p')}</li>
        <li><strong>Duration:</strong> ${session.duration} minutes</li>
        <li><strong>Location:</strong> ${session.location.type === 'online' ? 'Online Meeting' : session.location.details}</li>
        ${session.location.meetingLink ? `<li><strong>Meeting Link:</strong> <a href="${session.location.meetingLink}">${session.location.meetingLink}</a></li>` : ''}
      </ul>

      ${session.description ? `<p><strong>Description:</strong> ${session.description}</p>` : ''}

      <p>Please add this event to your calendar using the attached .ics file.</p>
      <p>You can confirm your attendance by logging into SkillSwap.</p>

      <p>Best regards,<br>The SkillSwap Team</p>
    `,
    update: `
      <h2>Session Rescheduled</h2>
      <p>Hi ${attendee.name},</p>
      <p>Your skill exchange session with ${organizer.name} has been rescheduled.</p>

      <h3>New Session Details:</h3>
      <ul>
        <li><strong>Title:</strong> ${session.title}</li>
        <li><strong>New Date:</strong> ${format(new Date(session.startTime), 'PPP')}</li>
        <li><strong>New Time:</strong> ${format(new Date(session.startTime), 'p')} - ${format(new Date(session.endTime), 'p')}</li>
      </ul>

      <p>Please update your calendar with the attached .ics file.</p>

      <p>Best regards,<br>The SkillSwap Team</p>
    `,
    cancel: `
      <h2>Session Cancelled</h2>
      <p>Hi ${attendee.name},</p>
      <p>Your skill exchange session "${session.title}" with ${organizer.name} has been cancelled.</p>

      ${session.cancellationReason ? `<p><strong>Reason:</strong> ${session.cancellationReason}</p>` : ''}

      <p>You can schedule a new session through SkillSwap.</p>

      <p>Best regards,<br>The SkillSwap Team</p>
    `,
  };

  const mailOptions = {
    from: process.env.EMAIL_FROM || '"SkillSwap" <noreply@skillswap.com>',
    to: attendee.email,
    subject: emailSubject[type],
    html: emailBody[type],
    attachments: type !== 'cancel' ? [
      {
        filename: 'session.ics',
        content: icsContent,
        contentType: 'text/calendar',
      },
    ] : [],
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Calendar invite sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending calendar invite:', error);
    throw error;
  }
};

// Send reminder emails
const sendReminder = async (session, user) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM || '"SkillSwap" <noreply@skillswap.com>',
    to: user.email,
    subject: `Reminder: ${session.title}`,
    html: `
      <h2>Session Reminder</h2>
      <p>Hi ${user.name},</p>
      <p>This is a reminder about your upcoming skill exchange session.</p>

      <h3>Session Details:</h3>
      <ul>
        <li><strong>Title:</strong> ${session.title}</li>
        <li><strong>Time:</strong> ${format(new Date(session.startTime), 'PPpp')}</li>
        ${session.location.meetingLink ? `<li><strong>Meeting Link:</strong> <a href="${session.location.meetingLink}">${session.location.meetingLink}</a></li>` : ''}
      </ul>

      <p>See you soon!</p>

      <p>Best regards,<br>The SkillSwap Team</p>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Reminder sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending reminder:', error);
    throw error;
  }
};

// Generate meeting links (placeholder - implement actual API integrations)
const generateMeetingLink = async (platform, session) => {
  // In production, integrate with actual video platforms
  const links = {
    'google-meet': `https://meet.google.com/${Math.random().toString(36).substring(7)}`,
    'zoom': `https://zoom.us/j/${Math.floor(Math.random() * 10000000000)}`,
    'teams': `https://teams.microsoft.com/l/meetup-join/${Math.random().toString(36).substring(7)}`,
    'skype': `https://join.skype.com/${Math.random().toString(36).substring(7)}`,
  };

  return links[platform] || '#';
};

module.exports = {
  generateICS,
  sendCalendarInvite,
  sendReminder,
  generateMeetingLink,
};