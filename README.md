# Telegram Bot with Telegraf and Sequelize

This is a Telegram bot built using Telegraf and Sequelize. The bot supports user registration, admin functionalities, and user management, including promotions and removals.

## Features
- User registration with full name, email, and phone number
- Admin panel with commands to list, promote, and remove users
- Pagination support for user listings
- Database integration using Postgres and Sequelize

## Technologies Used
- **Node.js**
- **Telegraf** (Telegram bot framework)
- **Sequelize** (ORM for Postgres)
- **dotenv** (For environment variable management)
- **Postgres** (Database)

## Setup Instructions
### Prerequisites
- Install [Node.js](https://nodejs.org/)
- Set up a Postgres database
- Create a Telegram bot using [BotFather](https://t.me/botfather) and obtain the bot token

### Installation
1. Clone the repository:
   ```sh
   git clone https://github.com/abelgideon/Administration-Telegram-Bot
   cd Administration-Telegram-Bot
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Create a `.env` file in the root directory and add your configuration:
   ```env
   BOT_TOKEN=your_telegram_bot_token
   DB_NAME=your_database_name
   DB_USER=your_database_user
   DB_PASSWORD=your_database_password
   DB_HOST=your_database_host
   ```
4. Run the bot:
   ```sh
   node index.js
   ```

## Database Schema
The bot uses Sequelize to interact with the database. The **users** table has the following schema:

| Column      | Type        | Description |
|------------|------------|-------------|
| telegramID | BIGINT     | Telegram user ID |
| fullName   | STRING     | User's full name |
| email      | STRING     | User's email address |
| phoneNumber | STRING     | User's phone number |
| isAdmin    | BOOLEAN    | Determines if the user is an admin (default: false) |

## Bot Functionalities
### User Registration
When a new user interacts with the bot, they are guided through a registration process where they provide:
1. Full name
2. Email address
3. Phone number

### User Commands
- `/myid` - Retrieve Telegram ID
- `/myprofile` - View user profile
- `/commands` - List available commands

### Admin Commands
- `/listusers` - View all registered users (paginated)
- `/promote` - Promote a user to admin
- `/remove` - Remove a user from the system
- `/commands` - List admin commands

### Bot Actions
- **Pagination:** Users can navigate through the list of users using **Previous** and **Next** buttons.
- **Promotion:** Admins can select a user from a list to promote them.
- **Removal:** Admins can select a user from a list to remove them.

## Deployment
To run the bot continuously on a server, use a process manager like **PM2**:
```sh
npm install -g pm2
pm2 start index.js --name telegram-bot
pm2 save
pm2 logs telegram-bot
```

## Contributions

Contributions are welcome! Fork the repository and submit a Pull Request with your improvements.
