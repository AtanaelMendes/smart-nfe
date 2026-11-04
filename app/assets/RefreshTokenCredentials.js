export default class RefreshTokenCredential{
  #refreshToken;

  constructor(refreshToken,) {
    this.refreshToken = refreshToken;
  }

  toString(){
    return {
      grant_type: 'refresh_token',
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      scope: null,
      refresh_token: this.refreshToken
    }
  }
}