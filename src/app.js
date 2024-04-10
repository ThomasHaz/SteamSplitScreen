const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

const config = require('../conf/config.js');

const express = require('express')
const app = express()

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}


async function getAllHandlers() {
  const url = 'https://hub.splitscreen.me/api/v1/allhandlers'
  const options = {
    method: 'GET',
  };

  try {
    const res = await fetch(url, options);
    const json = (await res.json()).Handlers;
    return json;
  } catch (err) {
    console.log(err)
  }
}

async function GetTokenIfNeeded() {
  if (config.igdb.access_token == '' || Date.now() >= config.igdb.expires_at) {
    try {
      console.log("New token needed. Retrieving.")
      const url = config.igdb.getTokenURL()
      const options = {
        method: 'POST'
      };
      const res = await fetch(url, options);
      const json = await res.json();

      config.igdb.access_token = json.access_token;
      config.igdb.expires_at = Date.now() + json.expires_in;

    } catch (err) {
      console.log("Error getting token: " + err)
    }
  } else {
    console.log("Valid token found.")
  }
}

app.get('/', async (req, res) => {
  await GetTokenIfNeeded()
  res.send(
    [
      `<a href="${config.web.host}:${config.web.port}/steam/splitscreen">/steam/splitscreen</a>`,
      `<a href="${config.web.host}:${config.web.port}/steam/splitscreen/handlers">/steam/splitscreen/handlers</a>`,
      `<a href="${config.web.host}:${config.web.port}/steam">/steam</a>`,

      `<a href="${config.web.host}:${config.web.port}/steam/igdb/all">/steam/igdb/all</a>`,
      `<a href="${config.web.host}:${config.web.port}/steam/igdb">/steam/igdb</a>`,
      `<a href="${config.web.host}:${config.web.port}/steam/igdb/0">/steam/igdb/page</a>`,

      `<a href="${config.web.host}:${config.web.port}/igdb">/igdb</a>`,
      `<a href="${config.web.host}:${config.web.port}/igdb/0">/igdb/page</a>`,

      `<a href="${config.web.host}:${config.web.port}/splitscreen">/splitscreen</a>`,
      `<a href="${config.web.host}:${config.web.port}/splitscreen/igdb">/splitscreen/igdb</a>`
    ].join("<br>")
  );
})


app.get('/steam/splitscreen', async (req, res) => {
  await GetTokenIfNeeded()

  const steam_url = `${config.web.host}:${config.web.port}/steam/igdb/-1`
  const split_url = `${config.web.host}:${config.web.port}/splitscreen/igdb`
  const options = {
    method: 'GET',
  };
  try {
    const steam_json_t = await fetch(steam_url, options);
    const steam_json = await steam_json_t.json();

    const split_json_t = await fetch(split_url, options);
    const split_json = await split_json_t.json();

    const filtered_t = steam_json.filter(e => {
      if (split_json.ss_igdb_ids.includes(e.game)) {
        return e
      }
    })

    const handlers = await getSplitScreen()

    const filtered = filtered_t.map(e => {
      return { igdb_id: e.game, steam_id: parseInt(e.uid), name: e.name }
    })

    console.log(filtered.length);
    res.send(`${JSON.stringify(filtered, null, 4)}`)
  } catch (err) {
    console.log(err)
  }
})



app.get('/steam/splitscreen/handlers', async (req, res) => {
  await GetTokenIfNeeded()

  const url = `${config.web.host}:${config.web.port}/steam/igdb/-1`
  const url2 = `${config.web.host}:${config.web.port}/splitscreen/igdb`
  const options = {
    method: 'GET',
  };
  try {

    const steam_json_t = await fetch(url, options);
    const steam_json = await steam_json_t.json();

    const split_json_t = await fetch(url2, options);
    const split_json = await split_json_t.json();
    const filtered_t = steam_json.filter(e => {
      if (split_json.ss_igdb_ids.includes(e.game)) {
        return e
      }
    })

    const handlers = await getSplitScreen()


    const filtered = filtered_t.map(e => {
      return { igdb_id: e.game, steam_id: parseInt(e.uid), name: e.name, handler: {} }
    })
    const reso = filtered.map(function (x) {
      return {
        igdb_id: x.igdb_id,
        steam: {
          name: x.name,
          id: x.steam_id,
          url: `https://store.steampowered.com/app/${x.steam_id}`,
        },
        handler: handlers.find(y => y.gameId == x.igdb_id)
      }
    });
    res.send(`${JSON.stringify(reso, null, 4)}`)
  } catch (err) {
    console.log(err)
  }
})


app.get('/steam', async (req, res) => {
  const json = await getSteamGames()
  const game_count = json.game_count
  const games = json.games
  const owned_IDs = games.map(e => {
    return e.appid
  })
  res.send(owned_IDs)
})


app.get('/steam/igdb/all', async (req, res) => res.redirect(`${config.web.host}:${config.web.port}/steam/igdb/-1`))
app.get('/steam/igdb', async (req, res) => res.redirect(`${config.web.host}:${config.web.port}/steam/igdb/0`))
app.get('/steam/igdb/:page', async (req, res) => {
  await GetTokenIfNeeded()
  
  const steamGames = await getSteamGames()
  console.log(steamGames)
  const game_count = steamGames.game_count
  const games = steamGames.games
  const owned_IDs = games.map(e => {
    return e.appid
  })

  try {
    if (req.params.page >= 0) {
      const json = await getIGDbGames(igdb_ids = [], steam_ids = owned_IDs, page = req.params.page)
      res.send(json)
    } else {
      var json = [];
      var index = 0;
      var tmp;
      do {
        tmp = await getIGDbGames(igdb_ids = [], steam_ids = owned_IDs, page = index)
        json = json.concat(tmp);
        index++;
        console.log("Page: " + index + "\n" + tmp.length + " items.\n\n")
        sleep(500);
      } while (tmp.length == 100);
      console.log(`${json.length} / ${game_count}`)
      res.send(json)
    }


  } catch (err) {
    console.log(err)
  }
})

async function getSteamGames() {
  const url = config.steam.getOwnedGamesURL()
  const options = {
    method: 'GET',
  };

  try {
    const res = await fetch(url, options);
    const json = await res.json();
    return json.response;
  } catch (err) {
    console.log(err)
  }
}
app.get('/igdb', (req, res) => res.redirect(`${config.web.host}:${config.web.port}/igdb/0`))
app.get('/igdb/:page', async (req, res) => {
  await GetTokenIfNeeded()
  
  const url = `${config.web.host}:${config.web.port}/splitscreen/igdb`
  const options = {
    method: 'GET',
  };
  try {
    const ids = await fetch(url, options);
    igdb_ids = (await ids.json()).ss_igdb_ids
    const json = await getIGDbGames(igdb_ids = igdb_ids, steam_ids = [], page = req.params.page)
    res.send(json)
  } catch (err) {
    console.log(err)
  }
})

async function getIGDbGames(igdb_ids = [], steam_ids = [], page = 0) {
  await GetTokenIfNeeded()
  
  const url = 'https://api.igdb.com/v4/external_games'
  query_str = igdb_ids.length > 0 ? `game = (${igdb_ids.join()})` : `uid = (${steam_ids.join()})`

  const options = {
    method: 'POST',
    headers: {
      "Client-ID": config.igdb.client,
      "Authorization": `Bearer ${config.igdb.access_token}`,
    },
    body: `fields game, uid, name, year, created_at; where category = 1 & ${query_str}; limit 100; offset ${100 * page};`
  }

  try {
    const res = await fetch(url, options);
    const json = await res.json();
    return json;
  } catch (err) {
    console.log(err)
  }
}

app.get('/splitscreen', async (req, res) => {
  const json = await getSplitScreen()
  res.send(json)
})

app.get('/splitscreen/igdb', async (req, res) => {
  await GetTokenIfNeeded()
  
  const json = await getSplitScreen()
  const game_count = json.length
  const game_IDs = json.map(e => {
    return e.gameId
  })
  console.log(game_count)
  res.send({ ss_igdb_ids: game_IDs })
})


async function getSplitScreen() {
  const url = 'https://hub.splitscreen.me/api/v1/allhandlers'
  const options = {
    method: 'GET',
  };

  try {
    const res = await fetch(url, options);
    const json = await res.json();
    return json.Handlers;
  } catch (err) {
    console.log(err)
  }
}

app.listen(config.web.port, () => {
  console.log(`Steam Split Screen listening on port ${config.web.port}`)
})
