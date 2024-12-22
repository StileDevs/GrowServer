![Example](/assets/ignore/banner.png)

> A Growtopia private server using Node.js

> [!NOTE]
> This source is not production ready yet. In the future it will be using a Docker to deploy the server, feel free to join [Discord Server](https://discord.gg/sGrxfKZY5t) to discuss regarding this.

## Requirements

- Node.js v18+ (Recommended LTS v20)
- npm (Included on Node.js) (Recommended [pnpm](https://pnpm.io))
- [mkcert](https://github.com/FiloSottile/mkcert)

## Setup

To setup the server, first install necessary packages & settings by

```
$ npm install
```

And congrats setup are done, simple as that!
Now you just need to run the server by

```
$ npm run dev
```

## Enviroment file

Example for default .env file (Generated automatically)

```
DISCORD_BOT_TOKEN=Tokxxxxxxxen
```

## Database

Database that we currently use is SQLite, since its easier & light instead of using JSON.
And for the ORM we are using [Drizzle-ORM](https://orm.drizzle.team/)

To view the database you can run this command below:

```
$ npm run studio
```

and access it on here https://local.drizzle.studio/

## Starting server

To run the development server by

```
$ npm run start
```

## Development

In order to make new login system work you need to install [mkcert](https://github.com/FiloSottile/mkcert) on this [download page](https://github.com/FiloSottile/mkcert/releases) (I'd recommend using [Lets encrypt](https://letsencrypt.org/getting-started/) for production only)

### Local CA installation

Install the mkcert local CA by

```
$ npm run mkcert:setup
```

### Hosts

For the hosts file you can see this example below

```
127.0.0.1 www.growtopia1.com
127.0.0.1 www.growtopia2.com
127.0.0.1 login.growserver.app # New login system for development purposes
```

## Contributing

Any contributions are welcome.

There's few rules of contributing:

- Code must match the existing code style. Please make sure to run `npm run lint` before submiting a PR.
- The commit must take review first before merging into `main` branch.

## Links

- [Discord Server](https://discord.gg/sGrxfKZY5t)

## Credits

Give a thumbs to these cool people:

- [Alexander (Syn9673)](https://github.com/Syn9673)
- [Restart](https://github.com/iRestartz)
- [Ritshu](https://github.com/Ritshu)
