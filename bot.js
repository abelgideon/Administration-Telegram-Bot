const { Telegraf, Markup, session, Scenes } = require("telegraf");
require("dotenv").config();
const { Sequelize, DataTypes } = require("sequelize");


const bot = new Telegraf(process.env.BOT_TOKEN);


// Cloudflare Webhook
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  
  if (url.pathname === '/webhook') {
      const updates = await request.json();
      await bot.handleUpdate(updates);
      return new Response('OK', { status: 200 });
  }
  
  await bot.setWebhook(`https://${url.hostname}/webhook`);
  return new Response('Webhook set', { status: 200 });
}


// SQL Connection
const sequelize = new Sequelize(
  `${process.env.DB_NAME}`,
  `${process.env.DB_USER}`,
  `${process.env.DB_PASSWORD}`,
  {
    host: `${process.env.DB_HOST}`,
    dialect: "mysql"
  }
);

sequelize
  .authenticate()
  .then(() => {
    console.log("Connection has been established successfully.");
  })
  .catch((error) => {
    console.error("Unable to connect to the database: ", error);
  });


// User Model
const User = sequelize.define("users", {
  telegramID: {
    type: DataTypes.BIGINT,
  },
  fullName: {
    type: DataTypes.STRING,
  },
  email: {
    type: DataTypes.STRING,
  },
  phoneNumber: {
    type: DataTypes.STRING,
  },
  isAdmin: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
});


// Registration Process
const registerSteps = new Scenes.WizardScene(
  "registerSteps",
  async (ctx) => {
    await ctx.reply("Welcome new user!\n\nPlease register below");
    ctx.reply("Enter your full name:");
    return ctx.wizard.next();
  },
  (ctx) => {
    ctx.scene.state.name = ctx.message.text;
    ctx.reply("Enter your email address:");
    return ctx.wizard.next();
  },
  (ctx) => {
    ctx.scene.state.email = ctx.message.text;
    ctx.reply("Enter your phone number");
    return ctx.wizard.next();
  },
  (ctx) => {
    ctx.scene.state.phone = ctx.message.text;

    User.create({
      telegramID: ctx.message.from.id,
      fullName: ctx.scene.state.name,
      email: ctx.scene.state.email,
      phoneNumber: ctx.scene.state.phone,
    })
      .then((res) => {
        console.log("New user added!");
        userMenu(ctx);
      })
      .catch((err) => console.error(err));

    return ctx.scene.leave();
  }
);

const stage = new Scenes.Stage([registerSteps]);
bot.use(session());
bot.use(stage.middleware());


// Helper Functions
function getUsers() {
  return User.findAll({ where: { isAdmin: false } });
}

async function getUserList(page) {
  const start = page * 3;
  const end = start + 3;
  const users = await getUsers();
  const pageUsers = users.slice(start, end);
  let message = "";

  pageUsers.forEach((user) => {
    message += `ID: ${user.dataValues.telegramID}\nFull Name: ${user.dataValues.fullName}\nEmail: ${user.dataValues.email}\nPhone number: ${user.dataValues.phoneNumber}\n\n---\n\n`;
  });

  return message;
}

async function getPageButton(page) {
  const users = await getUsers();

  const totalPages = Math.ceil(users.length / 3);
  return Markup.inlineKeyboard(
    [
      page > 0 ? Markup.button.callback("Previous", `prev_${page}`) : null,
      page < totalPages - 1
        ? Markup.button.callback("Next", `next_${page}`)
        : null,
    ].filter(Boolean)
  );
}

function checkIfUserExists(id, ctx) {
  User.findOne({ where: { telegramID: id } })
    .then((res) => {
      if (!res) {
        ctx.scene.enter("registerSteps");
      } else {
        userMenu(ctx);
      }
    })
    .catch((err) => console.error(err));
}

function checkIfAdmin(id) {
  return User.findOne({ where: { telegramID: id } })
    .then((res) => {
      if (res) {
        return res.dataValues.isAdmin;
      } else {
        return false;
      }
    })
    .catch((err) => console.error(err));
}

function adminMenu(ctx) {
  ctx.reply(
    "Welcome to the Admin Panel\n\n\nHere are the commands you can use:\n\n/listusers - List all users\n/promote - Promote a user to admin\n/remove - Remove a user\n/commands - List commands you can use"
  );
}

function userMenu(ctx) {
  ctx.reply(
    "Welcome to the User Panel\n\n\nHere are the commands you can use:\n\n/myprofile - View your profile\n/myid - Get your telegram ID\n/commands - List commands you can use"
  );
}

async function listAllUsers(ctx) {
  const message = await getUserList(0);
  const button = await getPageButton(0);

  ctx.session.page = 0;
  ctx.reply(message, button);
}

async function promoteUser(ctx) {
  const users = await getUsers();

  const buttons = users.map((user) =>
    Markup.button.callback(
      user.dataValues.fullName + " ( ID: " + user.dataValues.telegramID + " )",
      `promote_${user.dataValues.telegramID}`
    )
  );

  const inlineKeyboard = Markup.inlineKeyboard(buttons, { columns: 1 });

  ctx.reply("Choose the user you would like to promote:", inlineKeyboard);
}

async function removeUser(ctx) {
  const users = await getUsers();
  const buttons = users.map((user) =>
    Markup.button.callback(
      user.dataValues.fullName + " ( ID: " + user.dataValues.telegramID + " )",
      `remove_${user.dataValues.telegramID}`
    )
  );

  const inlineKeyboard = Markup.inlineKeyboard(buttons, { columns: 1 });
  ctx.reply("Choose the user you would like to remove:", inlineKeyboard);
}

// User Commands
bot.command("myid", async (ctx) => {
  let isAdmin = await checkIfAdmin(ctx.message.from.id);

  if (!isAdmin) {
    ctx.reply(`Your Telegram ID: ${ctx.message.from.id}`);
  } else {
    ctx.reply("You cannot access that command.");
  }
});

bot.command("myprofile", async (ctx) => {
  let isAdmin = await checkIfAdmin(ctx.message.from.id);

  if (!isAdmin) {
    const user = await User.findOne({
      where: { telegramID: ctx.message.from.id },
    });
    if (user) {
      ctx.reply(
        `Full name: ${user.dataValues.fullName}\nEmail: ${user.dataValues.email}\nPhone number: ${user.dataValues.phoneNumber}`
      );
    }
  } else {
    ctx.reply("You cannot access that command.");
  }
});

// Common Commands
bot.start(async (ctx) => {
  let userId = ctx.message.from.id;

  let isAdmin = await checkIfAdmin(userId);
  if (isAdmin) {
    adminMenu(ctx);
  } else {
    checkIfUserExists(userId, ctx);
  }
});

bot.command("commands", async (ctx) => {
  let isAdmin = await checkIfAdmin(ctx.message.from.id);

  if (isAdmin) {
    adminMenu(ctx);
  } else {
    userMenu(ctx);
  }
});

// Admin Commands
bot.command("listusers", async (ctx) => {
  let isAdmin = await checkIfAdmin(ctx.message.from.id);

  if (isAdmin) {
    listAllUsers(ctx);
  } else {
    ctx.reply("You cannot access that command.");
  }
});

bot.command("promote", async (ctx) => {
  let isAdmin = await checkIfAdmin(ctx.message.from.id);

  if (isAdmin) {
    promoteUser(ctx);
  } else {
    ctx.reply("You cannot access that command.");
  }
});

bot.command("remove", async (ctx) => {
  let isAdmin = await checkIfAdmin(ctx.message.from.id);

  if (isAdmin) {
    removeUser(ctx);
  } else {
    ctx.reply("You cannot access that command.");
  }
});


// Bot Actions
bot.action(/promote_(\d+)/, async (ctx) => {
  const id = ctx.match[1];

  const user = await User.findOne({ where: { telegramID: id } });
  if (user) {
    user.update({ isAdmin: true });
    ctx.reply(`${user.dataValues.fullName} has been promoted!`);
  } else {
    ctx.reply("User not found");
  }
});

bot.action(/remove_(\d+)/, async (ctx) => {
  const id = ctx.match[1];

  const user = await User.findOne({ where: { telegramID: id } });
  if (user) {
    user.destroy();
    ctx.reply(`User has been removed!`);
  } else {
    ctx.reply("User not found");
  }
});

bot.action(/(prev|next)_(\d+)/, async (ctx) => {
  let page = parseInt(ctx.match[2]);
  if (ctx.match[1] == "next") page++;
  else if (ctx.match[1] == "prev") page--;

  ctx.session.page = page;

  const message = await getUserList(page);
  const button = await getPageButton(page);

  ctx.editMessageText(message, button);
});

// Database Sync
sequelize
  .sync()
  .then(() => {
    bot.launch();
  })
  .catch((error) => {
    console.error("Unable to create table : ", error);
  });
