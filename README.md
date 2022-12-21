# GrowServer (WIP)

A Growtopia private server using NodeJS

## Requirements

#### Windows

- C++ Compiler ([MSVC](https://visualstudio.microsoft.com/vs/features/cplusplus/))
- Python 3
- NodeJS v16+

#### Linux

- Build Tools (build-essentials)
- Python 3
- NodeJS v16+

## Setup

First, create `assets` on the root folder. For the `items.dat` file, you need to create `assets/dat` then put the file inside. after that for the ssl files, you need to creat `assets/ssl` then put `server.key` & `server.crt` inside.

## Enviroment file

Example for default .env file

```
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=growtopia_db
MYSQL_USERNAME=root
MYSQL_PASS=
ENCRYPT_SECRET=SUPERSECRET # Default encrypt secret
WEB_ADDRESS=127.0.0.1
```

## Database

For the database, you need to import the database sql first from `assets/growtopia_db.sql`. You can use [XAMPP](https://www.apachefriends.org/download.html) for the database or using [MySQL Community Server](https://dev.mysql.com/downloads/mysql/).

## Starting server

Install all necessary dependencies by running:

```
$ npm install
```

After that, to run the development server by:

```
$ npm run dev
```

## Credits

Give a thumbs to these cool people:

- [Alexander (Syn9673)](https://github.com/Syn9673) with his `Growsockets` module.
- [Restart](https://github.com/iRestartz)
- [Ritshu](https://github.com/Ritshu)
