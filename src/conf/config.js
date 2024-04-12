var config = {};

config.steam = {};
config.igdb = {};
config.web = {};

config.steam.key = process.env.STEAM_KEY || '';
config.steam.user = process.env.STEAM_USER || '76561197960434622';
config.steam.getOwnedGamesURL = function() {
    return `http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${config.steam.key}&steamid=${config.steam.user}&format=json&include_appinfo=true`
}

config.igdb.client = process.env.IGDB_CLIENT_ID;
config.igdb.secret = process.env.IGDB_SECRET;
config.igdb.access_token = '';
config.igdb.expires_at = 0;
config.igdb.getTokenURL = function() {
    return `https://id.twitch.tv/oauth2/token?client_id=${config.igdb.client}&client_secret=${config.igdb.secret}&grant_type=client_credentials`
}

config.web.port = process.env.WEB_PORT || 9999;
config.web.host = process.env.WEB_HOST || 'http://127.0.0.1';

module.exports = config;