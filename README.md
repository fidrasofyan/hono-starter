# Hono Starter

This is a starter project for [Hono](https://hono.dev). Make sure you have [Bun](https://bun.sh) installed. We use [Prisma](https://www.prisma.io) to manage database migrations and [Kysely](https://kysely.dev) to interact with the database.

Copy the repository using [degit](https://github.com/Rich-Harris/degit):

```bash
degit github:fidrasofyan/hono-starter my-hono-app
```

Or you can simply clone the repository and delete the `.git` folder to start fresh:

```bash
git clone https://github.com/fidrasofyan/hono-starter my-hono-app
rm -rf my-hono-app/.git
```

## Get started

Run the following commands in the `my-hono-app` folder.

#### Install dependencies:

```bash
bun install
```

#### Generate JWT secret key:

```bash
bun generate-jwt-secret
```

Configure environment variables in `.env`

#### Prototyping Database Schemas:

```bash
bun db-dev-push
```
Use `bun db-dev-push` for prototyping schemas. Use `bun db-dev-migrate` to create database migrations.

#### Start the dev server:

```bash
bun dev
```

## Install git hooks (optional)

`git hooks` is a tool that makes it easy to automate common Git tasks. Learn more [here](https://git-scm.com/docs/githooks). 

```bash
bun install-git-hooks
```

Enjoy!

## VSCode Snippets
- Create route handlers
  ```bash
  apphandlers
  ```
- Create export star
  ```bash
  appexportstar
  ```