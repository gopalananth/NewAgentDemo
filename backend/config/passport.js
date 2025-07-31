const passport = require('passport');
const { OIDCStrategy } = require('passport-azure-ad');
const { User } = require('../models');
require('dotenv').config();

/**
 * Passport configuration for Office 365 authentication
 * 
 * This module configures Azure AD authentication using OpenID Connect (OIDC).
 * It handles user login, role assignment, and session management.
 */

// Azure AD OIDC Strategy Configuration
const azureConfig = {
  identityMetadata: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0/.well-known/openid_configuration`,
  clientID: process.env.AZURE_CLIENT_ID,
  clientSecret: process.env.AZURE_CLIENT_SECRET,
  responseType: 'code',
  responseMode: 'form_post',
  redirectUrl: process.env.AZURE_REDIRECT_URI,
  allowHttpForRedirectUrl: process.env.NODE_ENV === 'development',
  scope: ['profile', 'email', 'openid'],
  useCookieInsteadOfSession: false,
  cookieEncryptionKeys: [
    { 'key': process.env.SESSION_SECRET, 'iv': process.env.SESSION_SECRET }
  ],
  passReqToCallback: true
};

// Initialize Azure AD Strategy
passport.use('azure-ad', new OIDCStrategy(azureConfig, async (req, iss, sub, profile, accessToken, refreshToken, done) => {
  try {
    console.log('🔐 Azure AD authentication callback received');
    console.log('Profile:', JSON.stringify(profile, null, 2));

    // Extract user information from Azure AD profile
    const azureId = profile.oid || profile.sub;
    const email = profile.preferred_username || profile.upn || profile.email;
    const name = profile.displayName || profile.name || email;

    if (!azureId || !email) {
      return done(new Error('Missing required user information from Azure AD'), null);
    }

    // Find or create user in database
    let user = await User.findOne({ where: { azure_id: azureId } });

    if (!user) {
      // Create new user - default role is 'Demo User'
      // Administrator role should be manually assigned in database or through admin interface
      user = await User.create({
        azure_id: azureId,
        email: email,
        name: name,
        role: 'Demo User', // Default role
        last_login: new Date(),
        is_active: true
      });
      console.log('✅ New user created:', user.email);
    } else {
      // Update existing user's last login
      await user.update({
        last_login: new Date(),
        name: name, // Update name in case it changed in Azure AD
        is_active: true
      });
      console.log('✅ Existing user logged in:', user.email);
    }

    // Check if user is active
    if (!user.is_active) {
      return done(new Error('User account is deactivated'), null);
    }

    return done(null, user);
  } catch (error) {
    console.error('❌ Azure AD authentication error:', error);
    return done(error, null);
  }
}));

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    if (!user) {
      return done(new Error('User not found'), null);
    }
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;