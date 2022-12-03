# GrowServer

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

## Starting server

Install all necessary dependencies by running:

```
$ npm install
```

Since `GrowSockets` their `tsc` are not local use, you need to install `tsc` globally first by:

```
$ npm install -g typescript
```

After that, to run the development server by:

```
$ npm run dev
```
