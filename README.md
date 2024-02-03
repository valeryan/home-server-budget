# Home Budget App

This is a docker compose project to setup a handle development Media server.

## Dependencies

This container requires a proxy server like my [Home Docker Server](https://github.com/valeryan/home-server).

## Setup For Development

There are two parts to this application a dotnet Api and a NextJS app for the frontend.

To get ready for development you need to do the following:

1. Do `npm i` in the app directory
2. Do `npm i` in the root directory
3. From the root run `npm run dev`

This will use nodemon to watch the apps and rebuild the docker containers as needed.
