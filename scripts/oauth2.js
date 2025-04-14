// Import google-auth-library directly accessing OAuth2
import { OAuth2Client } from 'google-auth-library';

const CLIENT_ID = '56031022934-t5k4m2gacuur1rm9itfo0ii0667j7dg8.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI = 'http://127.0.0.1:3000/oauth2callback';

const oAuth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES.join(' '),
});

console.log('Authorize this app by visiting this url:', authUrl);

async function exchangeCodeForTokens(code) {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    console.log('Tokens:', tokens);
    return tokens;
}
