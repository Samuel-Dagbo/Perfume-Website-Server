const { google } = require('googleapis');
const nodemailer = require('nodemailer');

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI
);

oauth2Client.setCredentials({
  refresh_token: process.env.GMAIL_REFRESH_TOKEN
});

const getAccessToken = async () => {
  try {
    const { token } = await oauth2Client.getAccessToken();
    return token;
  } catch (error) {
    console.error('Error getting access token:', error);
    throw error;
  }
};

const transporter = async () => {
  const accessToken = await getAccessToken();
  
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: process.env.ADMIN_EMAIL || 'admin@luxuryperfume.com',
      clientId: process.env.GMAIL_CLIENT_ID,
      clientSecret: process.env.GMAIL_CLIENT_SECRET,
      refreshToken: process.env.GMAIL_REFRESH_TOKEN,
      accessToken: accessToken
    }
  });
};

const sendEmail = async (options) => {
  try {
    const mailTransport = await transporter();
    
    const mailOptions = {
      from: {
        name: 'Luxury Perfume',
        address: process.env.ADMIN_EMAIL || 'admin@luxuryperfume.com'
      },
      to: options.to,
      subject: options.subject,
      html: options.html
    };

    const info = await mailTransport.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Email error:', error);
    throw error;
  }
};

const welcomeEmail = async (user) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Luxury Perfume</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f9fafb;">
      <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px; text-align: center;">
          <h1 style="color: #d4af37; margin: 0; font-size: 32px; font-weight: 300; letter-spacing: 4px;">LUXURY PERFUME</h1>
        </div>
        
        <div style="padding: 40px; text-align: center;">
          <h2 style="color: #1a1a2e; font-size: 24px; font-weight: 400; margin-bottom: 20px;">Welcome, ${user.name}!</h2>
          
          <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
            Thank you for joining our exclusive collection of luxury fragrances. 
            Your account has been successfully created and you're now part of an elite community of fragrance connoisseurs.
          </p>
          
          <div style="background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%); border-radius: 8px; padding: 24px; margin-bottom: 30px;">
            <p style="color: #4b5563; font-size: 14px; margin: 0;">
              <strong>Your Account Details:</strong><br>
              Email: ${user.email}<br>
              Member since: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          
          <a href="${process.env.FRONTEND_URL}/shop" style="display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #f5d67b 100%); color: #1a1a2e; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; text-transform: uppercase; letter-spacing: 1px;">
            Explore Collection
          </a>
        </div>
        
        <div style="background: #1a1a2e; padding: 30px; text-align: center;">
          <p style="color: #9ca3af; font-size: 14px; margin: 0;">
            © 2024 Luxury Perfume. All rights reserved.<br>
            Indulge in the art of fragrance.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: user.email,
    subject: 'Welcome to Luxury Perfume - Your Account is Ready',
    html
  });
};

const loginNotificationEmail = async (user, deviceInfo) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>New Login Alert</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f9fafb;">
      <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px; text-align: center;">
          <h1 style="color: #d4af37; margin: 0; font-size: 32px; font-weight: 300; letter-spacing: 4px;">LUXURY PERFUME</h1>
        </div>
        
        <div style="padding: 40px; text-align: center;">
          <h2 style="color: #1a1a2e; font-size: 24px; font-weight: 400; margin-bottom: 20px;">New Login Detected</h2>
          
          <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
            We noticed a new sign-in to your Luxury Perfume account.
          </p>
          
          <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 8px; padding: 24px; margin-bottom: 30px; border-left: 4px solid #d4af37;">
            <p style="color: #92400e; font-size: 14px; margin: 0; text-align: left;">
              <strong>Login Details:</strong><br><br>
              Time: ${new Date().toLocaleString()}<br>
              ${deviceInfo ? `Device: ${deviceInfo}` : 'Device: Unknown'}<br>
              Location: Your account location<br><br>
              If this wasn't you, please secure your account immediately.
            </p>
          </div>
          
          <a href="${process.env.FRONTEND_URL}/profile" style="display: inline-block; background: #1a1a2e; color: #d4af37; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
            Review Account Activity
          </a>
        </div>
        
        <div style="background: #1a1a2e; padding: 30px; text-align: center;">
          <p style="color: #9ca3af; font-size: 14px; margin: 0;">
            © 2024 Luxury Perfume. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: user.email,
    subject: 'New Login to Your Luxury Perfume Account',
    html
  });
};

const passwordResetEmail = async (user, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Password Reset</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f9fafb;">
      <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px; text-align: center;">
          <h1 style="color: #d4af37; margin: 0; font-size: 32px; font-weight: 300; letter-spacing: 4px;">LUXURY PERFUME</h1>
        </div>
        
        <div style="padding: 40px; text-align: center;">
          <h2 style="color: #1a1a2e; font-size: 24px; font-weight: 400; margin-bottom: 20px;">Password Reset Request</h2>
          
          <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
            Hello ${user.name},<br><br>
            You requested to reset your password. Click the button below to create a new password.
          </p>
          
          <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 8px; padding: 20px; margin-bottom: 30px;">
            <p style="color: #92400e; font-size: 13px; margin: 0;">
              This link expires in 10 minutes. If you didn't request this, please ignore this email.
            </p>
          </div>
          
          <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #f5d67b 100%); color: #1a1a2e; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; text-transform: uppercase; letter-spacing: 1px;">
            Reset Password
          </a>
        </div>
        
        <div style="background: #1a1a2e; padding: 30px; text-align: center;">
          <p style="color: #9ca3af; font-size: 14px; margin: 0;">
            © 2024 Luxury Perfume. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: user.email,
    subject: 'Password Reset - Luxury Perfume',
    html
  });
};

const orderConfirmationEmail = async (order, user) => {
  const itemsHtml = order.items.map(item => `
    <tr>
      <td style="padding: 16px; border-bottom: 1px solid #f3f4f6;">
        <p style="margin: 0; color: #1a1a2e; font-weight: 500;">${item.name}</p>
        <p style="margin: 4px 0 0; color: #6b7280; font-size: 14px;">Qty: ${item.quantity}</p>
      </td>
      <td style="padding: 16px; border-bottom: 1px solid #f3f4f6; text-align: right; color: #1a1a2e;">
        ₵${item.total.toFixed(2)}
      </td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Order Confirmation</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f9fafb;">
      <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px; text-align: center;">
          <h1 style="color: #d4af37; margin: 0; font-size: 32px; font-weight: 300; letter-spacing: 4px;">LUXURY PERFUME</h1>
          <p style="color: #9ca3af; margin: 10px 0 0; font-size: 14px;">Order Confirmation</p>
        </div>
        
        <div style="padding: 40px;">
          <h2 style="color: #1a1a2e; font-size: 24px; font-weight: 400; margin-bottom: 10px;">Thank You, ${user.name}!</h2>
          <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
            Your order #${order._id.toString().slice(-8).toUpperCase()} has been confirmed and is being processed.
          </p>
          
          <div style="background: #f9fafb; border-radius: 8px; padding: 24px; margin-bottom: 30px;">
            <h3 style="color: #1a1a2e; font-size: 16px; margin: 0 0 16px; font-weight: 600;">Order Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              ${itemsHtml}
            </table>
            <div style="margin-top: 16px; padding-top: 16px; border-top: 2px solid #e5e7eb;">
              <table style="width: 100%;">
                <tr>
                  <td style="color: #6b7280; padding: 4px 0;">Subtotal:</td>
                  <td style="text-align: right; color: #1a1a2e;">₵${order.subtotal.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="color: #6b7280; padding: 4px 0;">Shipping:</td>
                  <td style="text-align: right; color: #1a1a2e;">${order.shippingCost === 0 ? 'Free' : '₵' + order.shippingCost.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="color: #6b7280; padding: 4px 0;">Tax:</td>
                  <td style="text-align: right; color: #1a1a2e;">₵${order.tax.toFixed(2)}</td>
                </tr>
                <tr style="font-weight: 600;">
                  <td style="color: #1a1a2e; padding: 8px 0 0; font-size: 18px;">Total:</td>
                  <td style="text-align: right; color: #d4af37; font-size: 18px;">₵${order.total.toFixed(2)}</td>
                </tr>
              </table>
            </div>
          </div>
          
          <div style="background: #f9fafb; border-radius: 8px; padding: 24px; margin-bottom: 30px;">
            <h3 style="color: #1a1a2e; font-size: 16px; margin: 0 0 16px; font-weight: 600;">Shipping Address</h3>
            <p style="color: #6b7280; margin: 0; line-height: 1.6;">
              ${order.shippingAddress.fullName}<br>
              ${order.shippingAddress.street}<br>
              ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zipCode}<br>
              ${order.shippingAddress.country}
            </p>
          </div>
          
          <a href="${process.env.FRONTEND_URL}/orders" style="display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #f5d67b 100%); color: #1a1a2e; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; text-transform: uppercase; letter-spacing: 1px;">
            View Order
          </a>
        </div>
        
        <div style="background: #1a1a2e; padding: 30px; text-align: center;">
          <p style="color: #9ca3af; font-size: 14px; margin: 0;">
            © ${new Date().getFullYear()} Luxury Perfume. All rights reserved.<br>
            Questions? Contact us at support@luxuryperfume.com
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: user.email,
    subject: `Order Confirmed #${order._id.toString().slice(-8).toUpperCase()} - Luxury Perfume`,
    html
  });
};

const orderStatusUpdateEmail = async (order, user, newStatus) => {
  const statusMessages = {
    processing: 'Your order is being prepared',
    shipped: 'Your order has been shipped',
    delivered: 'Your order has been delivered',
    cancelled: 'Your order has been cancelled'
  };

  const statusColors = {
    processing: '#3b82f6',
    shipped: '#8b5cf6',
    delivered: '#10b981',
    cancelled: '#ef4444'
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Order Update</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f9fafb;">
      <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px; text-align: center;">
          <h1 style="color: #d4af37; margin: 0; font-size: 32px; font-weight: 300; letter-spacing: 4px;">LUXURY PERFUME</h1>
        </div>
        
        <div style="padding: 40px; text-align: center;">
          <div style="width: 80px; height: 80px; border-radius: 50%; background: ${statusColors[newStatus]}20; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 32px;">${newStatus === 'shipped' ? '📦' : newStatus === 'delivered' ? '✅' : newStatus === 'cancelled' ? '❌' : '📋'}</span>
          </div>
          
          <h2 style="color: #1a1a2e; font-size: 24px; font-weight: 400; margin-bottom: 10px;">${statusMessages[newStatus]}</h2>
          <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
            Hello ${user.name},<br>
            Order #${order._id.toString().slice(-8).toUpperCase()} has been updated.
          </p>
          
          ${newStatus === 'shipped' && order.trackingNumber ? `
          <div style="background: #f9fafb; border-radius: 8px; padding: 24px; margin-bottom: 30px;">
            <p style="color: #6b7280; margin: 0; font-size: 14px;">Tracking Number</p>
            <p style="color: #1a1a2e; font-size: 18px; font-weight: 600; margin: 8px 0 0;">${order.trackingNumber}</p>
          </div>
          ` : ''}
          
          <a href="${process.env.FRONTEND_URL}/orders/${order._id}" style="display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #f5d67b 100%); color: #1a1a2e; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; text-transform: uppercase; letter-spacing: 1px;">
            View Order Details
          </a>
        </div>
        
        <div style="background: #1a1a2e; padding: 30px; text-align: center;">
          <p style="color: #9ca3af; font-size: 14px; margin: 0;">
            © 2024 Luxury Perfume. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: user.email,
    subject: `Order Update #${order._id.toString().slice(-8).toUpperCase()} - ${statusMessages[newStatus]}`,
    html
  });
};

module.exports = {
  sendEmail,
  welcomeEmail,
  loginNotificationEmail,
  passwordResetEmail,
  orderConfirmationEmail,
  orderStatusUpdateEmail
};
