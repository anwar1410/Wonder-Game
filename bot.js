// بوت ديسكورد باستخدام discord.js v14
const { Client, GatewayIntentBits, Partials, REST, Routes, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Events, StringSelectMenuBuilder } = require('discord.js');
require('dotenv').config();
const fs = require('fs');
const SETTINGS_FILE = 'settings.json';
function loadSettingsAll() {
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
  } catch {
    return {};
  }
}
function saveSettingsAll(allSettings) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(allSettings, null, 2));
}
function getGuildSettings(guildId) {
  const all = loadSettingsAll();
  if (!all[guildId]) {
    all[guildId] = {
      gameRoomId: null,
      voteMessage: { text: null, emoji: null, roleId: null },
      gameMessage: { text: null, link: null, code: null, roleId: null },
      endMessage: { text: null, roleId: null },
      logRoomId: null,
      botStopped: false // جديد: حالة البوت
    };
    saveSettingsAll(all);
  }
  // إضافة الخاصية إذا لم تكن موجودة (للسيرفرات القديمة)
  if (all[guildId].botStopped === undefined) {
    all[guildId].botStopped = false;
    saveSettingsAll(all);
  }
  return all[guildId];
}
function saveGuildSettings(guildId, settings) {
  const all = loadSettingsAll();
  all[guildId] = settings;
  saveSettingsAll(all);
}

async function isAdmin(interaction) {
  let member = interaction.member;
  if (!member && interaction.guild) {
    member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  }
  return member && member.permissions.has('Administrator');
}

const TOKEN = process.env.BOT_TOKEN; // ضع توكن البوت في ملف .env
const CLIENT_ID = process.env.CLIENT_ID; // ضع آيدي البوت في ملف .env

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel],
});

// أمر السلاش /اقيام
const commands = [
  new SlashCommandBuilder()
    .setName('اقيام')
    .setDescription('إرسال ايمبيد القيم مع الأزرار')
];

// إضافة أمر /ادارة
commands.push(
  new SlashCommandBuilder()
    .setName('ادارة')
    .setDescription('إدارة إعدادات القيم (Admins فقط)')
);

// آيدي المطورين المسموح لهم باستخدام أمر /المطور
const DEVELOPERS = [
  '1337512375355707412',
  '1291805249815711826',
  '1319791882389164072',
];

// إضافة أمر /المطور
commands.push(
  new SlashCommandBuilder()
    .setName('المطور')
    .setDescription('أوامر خاصة بالمطورين فقط')
);

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands.map(cmd => cmd.toJSON()) },
    );
    console.log('تم تسجيل أمر /اقيام بنجاح');
  } catch (error) {
    console.error(error);
  }
})();

client.once(Events.ClientReady, () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// رابط صورة الشعار الجديد
const EMBED_IMAGE = 'https://media.discordapp.net/attachments/1303476251746504726/1388435070141861918/Clean_20250626_130356_.png?ex=687b566c&is=687a04ec&hm=b313d0f6c9b6f2fac8415fe5de7ca16bbf7945544033defacb76f74556fa7ccb&=&format=webp&quality=lossless';

client.on(Events.InteractionCreate, async interaction => {
  // التحقق من صلاحية الأدمن فقط
  if (interaction.isChatInputCommand()) {
    // منع الأوامر إذا كان البوت متوقفًا في هذا السيرفر (عدا المطورين)
    const settings = getGuildSettings(interaction.guild?.id);
    if (settings?.botStopped && !DEVELOPERS.includes(interaction.user.id)) {
      const devMentions = DEVELOPERS.map(id => `<@${id}>`).join(' ');
      return interaction.reply({
        content: `🚫 البوت حاليا متوقف من أحد المطورين يرجى التواصل مع أحدهم ${devMentions}`,
        ephemeral: true
      });
    }
    if (interaction.commandName === 'اقيام') {
      // ايمبيد القيم
      const settings = getGuildSettings(interaction.guild.id);
      const embed = new EmbedBuilder()
        .setTitle('قيم جديد!')
        .setDescription('استخدم الأزرار بالأسفل لإدارة القيم.')
        .setColor(0x0099ff);
      if (settings.embedImage) {
        embed.setImage(settings.embedImage);
      }
      // الأزرار
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('start_game')
          .setLabel('بدء قيم')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('start_vote')
          .setLabel('بدء تصويت قيم')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('end_game')
          .setLabel('إنهاء قيم')
          .setStyle(ButtonStyle.Danger)
      );
      await interaction.reply({ embeds: [embed], components: [row] });
    }
    if (interaction.commandName === 'ادارة') {
      // تحقق من صلاحية الأدمن
      if (!(await isAdmin(interaction))) {
        return interaction.reply({ content: '❌ هذا الأمر مخصص فقط للأدمن.', ephemeral: true });
      }
      const settings = getGuildSettings(interaction.guild.id);
      // ايمبيد الإدارة
      const adminEmbed = new EmbedBuilder()
        .setTitle('إدارة إعدادات القيم')
        .setDescription('يمكنك من هنا تعيين إعدادات القيم المختلفة. اختر من القائمة بالأسفل.')
        .setColor(0x0099ff);
      if (settings.embedImage) {
        adminEmbed.setImage(settings.embedImage);
      }
      // قائمة منسدلة (تصحيح)
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('admin_select')
        .setPlaceholder('اختر إجراء...')
        .addOptions([
          { label: 'تعيين روم الاقيام', value: 'set_game_room', description: 'تعيين القناة التي ترسل فيها رسائل القيم' },
          { label: 'تعيين رسالة التصويت', value: 'set_vote_message', description: 'تعيين نص التصويت والإيموجي' },
          { label: 'تعيين رسالة الاقيام', value: 'set_game_message', description: 'تعيين نص ورابط وكود القيم' },
          { label: 'تعيين نص انهاء القيم', value: 'set_end_message', description: 'تعيين نص ومنشن رسالة انهاء القيم' },
          { label: 'تعيين لوق الاقيام', value: 'set_log_room', description: 'تعيين قناة اللوق' },
          { label: 'رؤية التعديلات', value: 'view_changes', description: 'عرض جميع التعيينات الحالية' },
          { label: 'تحديث الصفحة', value: 'refresh_admin', description: 'تحديث الصفحة فقط' },
        ]);
      const row = new ActionRowBuilder().addComponents(selectMenu);
      await interaction.reply({ embeds: [adminEmbed], components: [row], ephemeral: true });
    }
    if (interaction.commandName === 'المطور') {
      if (!DEVELOPERS.includes(interaction.user.id)) {
        return interaction.reply({ content: '❌ هذا الأمر مخصص فقط للمطورين.', ephemeral: true });
      }
      // ايمبيد المطور مع قائمة منسدلة
      const embed = new EmbedBuilder()
        .setTitle('لوحة تحكم المطور')
        .setDescription('اختر إجراء من القائمة بالأسفل:')
        .setColor(0x8e44ad);
      if (getGuildSettings(interaction.guild?.id || interaction.guildId)?.embedImage) {
        embed.setImage(getGuildSettings(interaction.guild?.id || interaction.guildId)?.embedImage);
      }
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('dev_main_menu')
        .setPlaceholder('اختر إجراء...')
        .addOptions([
          { label: 'رؤية السيرفرات', value: 'dev_view_guilds', description: 'عرض قائمة السيرفرات التي يعمل فيها البوت' },
          { label: 'تغيير الايمبيد', value: 'dev_change_embed', description: 'تغيير صورة الايمبيد الافتراضية لسيرفر معين' },
          { label: 'إيقاف & تشغيل البوت', value: 'dev_toggle_bot', description: 'إيقاف أو تشغيل البوت في سيرفر معين' },
        ]);
      const row = new ActionRowBuilder().addComponents(selectMenu);
      await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }
  }
  // تفاعل القائمة المنسدلة في واجهة الإدارة
  if (interaction.isStringSelectMenu() && interaction.customId === 'admin_select') {
    // تحقق من صلاحية الأدمن
    if (!(await isAdmin(interaction))) {
      return interaction.reply({ content: '❌ هذا الإجراء مخصص فقط للأدمن.', ephemeral: true });
    }
    // تحقق من تعيين اللوق لجميع الخيارات ما عدا تعيين اللوق
    const selected = interaction.values[0];
    let settings = getGuildSettings(interaction.guild.id);
    if (selected === 'view_changes') {
      const embed = new EmbedBuilder()
        .setTitle('التعيينات الحالية')
        .setColor(0x5865F2)
        .addFields(
          { name: 'روم القيم', value: settings.gameRoomId ? `<#${settings.gameRoomId}>` : 'غير محدد', inline: false },
          { name: 'رسالة التصويت', value: settings.voteMessage?.text ? `النص: ${settings.voteMessage.text}\nالإيموجي: ${settings.voteMessage.emoji || 'غير محدد'}\nالرتبة: ${settings.voteMessage.roleId ? `<@&${settings.voteMessage.roleId}>` : 'غير محدد'}` : 'غير محدد', inline: false },
          { name: 'رسالة القيم', value: settings.gameMessage?.text ? `النص: ${settings.gameMessage.text}\nالرابط: ${settings.gameMessage.link || 'غير محدد'}\nالكود: ${settings.gameMessage.code || 'غير محدد'}\nالرتبة: ${settings.gameMessage.roleId ? `<@&${settings.gameMessage.roleId}>` : 'غير محدد'}` : 'غير محدد', inline: false },
          { name: 'نص إنهاء القيم', value: settings.endMessage?.text ? `النص: ${settings.endMessage.text}\nالرتبة: ${settings.endMessage.roleId ? `<@&${settings.endMessage.roleId}>` : 'غير محدد'}` : 'غير محدد', inline: false },
          { name: 'قناة اللوق', value: settings.logRoomId ? `<#${settings.logRoomId}>` : 'غير محدد', inline: false },
        );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    // تحقق من تعيين اللوق لجميع الخيارات ما عدا تعيين اللوق
    if (selected !== 'set_log_room' && !settings.logRoomId) {
      return interaction.reply({ content: '❌ يجب تعيين روم اللوق أولاً قبل استخدام هذه الخيارات.', ephemeral: true });
    }
    if (selected === 'set_game_room') {
      return interaction.showModal({
        custom_id: 'modal_set_game_room',
        title: 'تعيين روم القيم',
        components: [
          {
            type: 1,
            components: [
              {
                type: 4,
                custom_id: 'game_room_id',
                label: 'آيدي روم القيم',
                style: 1,
                min_length: 17,
                max_length: 20,
                required: true
              }
            ]
          }
        ]
      });
    } else if (selected === 'set_vote_message') {
      // مودال تعيين رسالة التصويت مع خانة آيدي الرتبة
      return interaction.showModal({
        custom_id: 'modal_set_vote_message',
        title: 'تعيين رسالة التصويت',
        components: [
          {
            type: 1,
            components: [
              {
                type: 4,
                custom_id: 'vote_text',
                label: 'النص المرسل',
                style: 1,
                min_length: 1,
                max_length: 200,
                required: true
              }
            ]
          },
          {
            type: 1,
            components: [
              {
                type: 4,
                custom_id: 'vote_emoji',
                label: 'الإيموجي المستعمل',
                style: 1,
                min_length: 1,
                max_length: 50,
                required: true
              }
            ]
          },
          {
            type: 1,
            components: [
              {
                type: 4,
                custom_id: 'vote_role',
                label: 'آيدي الرتبة',
                style: 1,
                min_length: 1,
                max_length: 30,
                required: true
              }
            ]
          }
        ]
      });
    } else if (selected === 'set_game_message') {
      return interaction.showModal({
        custom_id: 'modal_set_game_message',
        title: 'تعيين رسالة القيم',
        components: [
          {
            type: 1,
            components: [
              {
                type: 4,
                custom_id: 'game_text',
                label: 'النص',
                style: 1,
                min_length: 1,
                max_length: 200,
                required: true
              }
            ]
          },
          {
            type: 1,
            components: [
              {
                type: 4,
                custom_id: 'game_link',
                label: 'رابط القيم',
                style: 1,
                min_length: 1,
                max_length: 200,
                required: true
              }
            ]
          },
          {
            type: 1,
            components: [
              {
                type: 4,
                custom_id: 'game_code',
                label: 'كود القيم',
                style: 1,
                min_length: 1,
                max_length: 50,
                required: true
              }
            ]
          },
          {
            type: 1,
            components: [
              {
                type: 4,
                custom_id: 'game_role',
                label: 'آيدي الرتبة',
                style: 1,
                min_length: 1,
                max_length: 30,
                required: true
              }
            ]
          }
        ]
      });
    } else if (selected === 'set_end_message') {
      // مودال تعيين نص انهاء القيم
      return interaction.showModal({
        custom_id: 'modal_set_end_message',
        title: 'تعيين نص انهاء القيم',
        components: [
          {
            type: 1,
            components: [
              {
                type: 4,
                custom_id: 'end_text',
                label: 'النص',
                style: 1,
                min_length: 1,
                max_length: 200,
                required: true
              }
            ]
          },
          {
            type: 1,
            components: [
              {
                type: 4,
                custom_id: 'end_role',
                label: 'آيدي الرتبة',
                style: 1,
                min_length: 1,
                max_length: 30,
                required: true
              }
            ]
          }
        ]
      });
    } else if (selected === 'set_log_room') {
      return interaction.showModal({
        custom_id: 'modal_set_log_room',
        title: 'تعيين روم اللوق',
        components: [
          {
            type: 1,
            components: [
              {
                type: 4,
                custom_id: 'log_room_id',
                label: 'آيدي روم اللوق',
                style: 1,
                min_length: 17,
                max_length: 20,
                required: true
              }
            ]
          }
        ]
      });
    } else if (selected === 'refresh_admin') {
      const settings = getGuildSettings(interaction.guild.id);
      // إعادة تعيين: فقط تحديث الصفحة (إعادة إرسال نفس الرسالة)
      const adminEmbed = new EmbedBuilder()
        .setTitle('إدارة إعدادات القيم')
        .setDescription('يمكنك من هنا تعيين إعدادات القيم المختلفة. اختر من القائمة بالأسفل.')
        .setColor(0x0099ff);
      if (settings.embedImage) {
        adminEmbed.setImage(settings.embedImage);
      }
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('admin_select')
        .setPlaceholder('اختر إجراء...')
        .addOptions([
          { label: 'تعيين روم الاقيام', value: 'set_game_room', description: 'تعيين القناة التي ترسل فيها رسائل القيم' },
          { label: 'تعيين رسالة التصويت', value: 'set_vote_message', description: 'تعيين نص التصويت والإيموجي' },
          { label: 'تعيين رسالة الاقيام', value: 'set_game_message', description: 'تعيين نص ورابط وكود القيم' },
          { label: 'تعيين نص انهاء القيم', value: 'set_end_message', description: 'تعيين نص ومنشن رسالة انهاء القيم' },
          { label: 'تعيين لوق الاقيام', value: 'set_log_room', description: 'تعيين قناة اللوق' },
          { label: 'رؤية التعديلات', value: 'view_changes', description: 'عرض جميع التعيينات الحالية' },
          { label: 'تحديث الصفحة', value: 'refresh_admin', description: 'تحديث الصفحة فقط' },
        ]);
      const row = new ActionRowBuilder().addComponents(selectMenu);
      return interaction.update({ embeds: [adminEmbed], components: [row] });
    }
  }
  // تفاعل قائمة المطور الرئيسية
  if (interaction.isStringSelectMenu() && (interaction.customId === 'dev_main_menu' || interaction.customId.startsWith('dev_guilds_menu_') || interaction.customId.startsWith('dev_togglebot_guilds_menu_') || interaction.customId.includes('changeembed'))) {
    if (!DEVELOPERS.includes(interaction.user.id)) {
      return interaction.reply({ content: '❌ هذا الإجراء مخصص فقط للمطورين.', ephemeral: true });
    }
    let selected, customId, page, perPage, totalPages, guilds, guildsPage, guildOptions;
    if (interaction.customId === 'dev_main_menu') {
      selected = interaction.values[0];
      guilds = Array.from(interaction.client.guilds.cache.values());
      page = 0;
      perPage = 23;
      totalPages = Math.ceil(guilds.length / perPage);
      guildsPage = guilds.slice(page * perPage, (page + 1) * perPage);
      guildOptions = guildsPage.map(g => ({
        label: g.name,
        value: selected === 'dev_toggle_bot' ? `dev_togglebot_guildinfo_${g.id}` : `dev_guildinfo_${g.id}`,
        description: `ID: ${g.id}`.slice(0, 100)
      }));
      if (totalPages > 1) {
        guildOptions.push({ label: 'رؤية المزيد', value: selected === 'dev_toggle_bot' ? 'dev_togglebot_guilds_nextpage_1' : 'dev_guilds_nextpage_1', description: 'عرض المزيد من السيرفرات' });
      }
      customId = selected === 'dev_toggle_bot' ? 'dev_togglebot_guilds_menu_0' : 'dev_guilds_menu_0';
      if (selected === 'dev_change_embed') customId = 'dev_guilds_menu_0_changeembed';
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(customId)
        .setPlaceholder('اختر سيرفر...')
        .addOptions(guildOptions);
      const row = new ActionRowBuilder().addComponents(selectMenu);
      const embed = new EmbedBuilder()
        .setTitle('قائمة السيرفرات')
        .setDescription('اختر سيرفر من القائمة بالأسفل لعرض معلوماته.')
        .setColor(0x2980b9);
      if (getGuildSettings(interaction.guild?.id || interaction.guildId)?.embedImage) {
        embed.setImage(getGuildSettings(interaction.guild?.id || interaction.guildId)?.embedImage);
      }
      await interaction.update({ embeds: [embed], components: [row] });
      return;
    }
    // باقي منطق الصفحات (تعديل القوائم المنسدلة)
    if (interaction.customId.startsWith('dev_guilds_menu_') || interaction.customId.startsWith('dev_togglebot_guilds_menu_') || interaction.customId.includes('changeembed')) {
      page = parseInt(interaction.customId.split('_')[3], 10) || 0;
      guilds = Array.from(interaction.client.guilds.cache.values());
      perPage = 23;
      totalPages = Math.ceil(guilds.length / perPage);
      selected = interaction.values[0];
      let isToggle = interaction.customId.startsWith('dev_togglebot_guilds_menu_');
      let isChangeEmbed = interaction.customId.includes('changeembed');
      if (selected.startsWith('dev_guilds_nextpage_') || selected.startsWith('dev_togglebot_guilds_nextpage_')) {
        const nextPage = parseInt(selected.split('_').pop(), 10);
        guildsPage = guilds.slice(nextPage * perPage, (nextPage + 1) * perPage);
        guildOptions = guildsPage.map(g => ({
          label: g.name,
          value: isToggle ? `dev_togglebot_guildinfo_${g.id}` : isChangeEmbed ? `dev_guildinfo_${g.id}_changeembed` : `dev_guildinfo_${g.id}`,
          description: `ID: ${g.id}`.slice(0, 100)
        }));
        if (totalPages > nextPage + 1) {
          guildOptions.push({ label: 'رؤية المزيد', value: isToggle ? `dev_togglebot_guilds_nextpage_${nextPage + 1}` : isChangeEmbed ? `dev_guilds_nextpage_${nextPage + 1}_changeembed` : `dev_guilds_nextpage_${nextPage + 1}`, description: 'عرض المزيد من السيرفرات' });
        }
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId(isToggle ? `dev_togglebot_guilds_menu_${nextPage}` : isChangeEmbed ? `dev_guilds_menu_${nextPage}_changeembed` : `dev_guilds_menu_${nextPage}`)
          .setPlaceholder('اختر سيرفر...')
          .addOptions(guildOptions);
        const row = new ActionRowBuilder().addComponents(selectMenu);
        const embed = new EmbedBuilder()
          .setTitle('قائمة السيرفرات')
          .setDescription('اختر سيرفر من القائمة بالأسفل لعرض معلوماته.')
          .setColor(0x2980b9);
        await interaction.update({ embeds: [embed], components: [row] });
        return;
      }
    }
  }
  // تفاعل قائمة السيرفرات لإيقاف/تشغيل البوت
  if (interaction.isStringSelectMenu() && interaction.customId.startsWith('dev_togglebot_guilds_menu_')) {
    if (!DEVELOPERS.includes(interaction.user.id)) {
      return interaction.reply({ content: '❌ هذا الإجراء مخصص فقط للمطورين.', ephemeral: true });
    }
    const page = parseInt(interaction.customId.split('_')[4], 10) || 0;
    const guilds = Array.from(interaction.client.guilds.cache.values());
    const perPage = 23;
    const totalPages = Math.ceil(guilds.length / perPage);
    let selected = interaction.values[0];
    if (selected.startsWith('dev_togglebot_guilds_nextpage_')) {
      const nextPage = parseInt(selected.split('_').pop(), 10);
      const guildsPage = guilds.slice(nextPage * perPage, (nextPage + 1) * perPage);
      const guildOptions = guildsPage.map(g => ({
        label: g.name,
        value: `dev_togglebot_guildinfo_${g.id}`,
        description: `ID: ${g.id}`.slice(0, 100)
      }));
      if (totalPages > nextPage + 1) {
        guildOptions.push({ label: 'رؤية المزيد', value: `dev_togglebot_guilds_nextpage_${nextPage + 1}`, description: 'عرض المزيد من السيرفرات' });
      }
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`dev_togglebot_guilds_menu_${nextPage}`)
        .setPlaceholder('اختر سيرفر...')
        .addOptions(guildOptions);
      const row = new ActionRowBuilder().addComponents(selectMenu);
      const embed = new EmbedBuilder()
        .setTitle('قائمة السيرفرات')
        .setDescription('اختر سيرفر من القائمة بالأسفل لعرض معلوماته.')
        .setColor(0x2980b9);
      await interaction.update({ embeds: [embed], components: [row] });
      return;
    }
    if (selected.startsWith('dev_togglebot_guildinfo_')) {
      const guildId = selected.split('_').pop();
      const guild = interaction.client.guilds.cache.get(guildId);
      if (!guild) {
        return interaction.reply({ content: '❌ لم يتم العثور على السيرفر.', ephemeral: true });
      }
      let ownerTag = 'غير معروف';
      let ownerId = 'غير معروف';
      try {
        const owner = await guild.fetchOwner();
        ownerTag = owner.user.tag;
        ownerId = owner.user.id;
      } catch {}
      // حالة البوت وزمن التشغيل
      const settings = getGuildSettings(guildId);
      const botStatus = settings.botStopped ? 'متوقف' : 'مفعل';
      const uptime = '00:00:00'; // سيتم تطويره لاحقاً
      const embed = new EmbedBuilder()
        .setTitle(`معلومات السيرفر: ${guild.name}`)
        .setColor(settings.botStopped ? 0xe74c3c : 0x27ae60)
        .addFields(
          { name: 'اسم السيرفر', value: guild.name, inline: true },
          { name: 'آيدي السيرفر', value: guild.id, inline: true },
          { name: 'أونر السيرفر', value: `<@${ownerId}> (${ownerTag})`, inline: false },
          { name: 'حالة البوت', value: botStatus, inline: true },
          { name: 'زمن التشغيل', value: uptime, inline: true }
        )
        .setTimestamp();
      // زر إيقاف/تشغيل البوت
      const toggleBtn = new ButtonBuilder()
        .setCustomId(settings.botStopped ? `dev_start_bot_${guildId}` : `dev_stop_bot_${guildId}`)
        .setLabel(settings.botStopped ? 'تشغيل البوت' : 'إيقاف البوت')
        .setStyle(settings.botStopped ? ButtonStyle.Success : ButtonStyle.Danger);
      const row = new ActionRowBuilder().addComponents(toggleBtn);
      await interaction.update({ embeds: [embed], components: [row], ephemeral: true });
      return;
    }
  }
  // تفاعل قائمة السيرفرات (صفحات)
  if (interaction.isStringSelectMenu() && interaction.customId.startsWith('dev_guilds_menu_')) {
    if (!DEVELOPERS.includes(interaction.user.id)) {
      return interaction.reply({ content: '❌ هذا الإجراء مخصص فقط للمطورين.', ephemeral: true });
    }
    // تحقق من السياق: هل القائمة لتغيير الايمبيد؟
    const isChangeEmbed = interaction.customId.includes('changeembed');
    const page = parseInt(interaction.customId.split('_')[3], 10) || 0;
    const guilds = Array.from(interaction.client.guilds.cache.values());
    const perPage = 23;
    const totalPages = Math.ceil(guilds.length / perPage);
    let selected = interaction.values[0];
    if (selected.startsWith('dev_guilds_nextpage_')) {
      const nextPage = parseInt(selected.split('_').pop(), 10);
      const guildsPage = guilds.slice(nextPage * perPage, (nextPage + 1) * perPage);
      const guildOptions = guildsPage.map(g => ({
        label: g.name,
        value: `dev_guildinfo_${g.id}`,
        description: `ID: ${g.id}`.slice(0, 100)
      }));
      if (totalPages > nextPage + 1) {
        guildOptions.push({ label: 'رؤية المزيد', value: `dev_guilds_nextpage_${nextPage + 1}`, description: 'عرض المزيد من السيرفرات' });
      }
      // مرر السياق في custom_id
      let customId = `dev_guilds_menu_${nextPage}`;
      if (isChangeEmbed) customId += '_changeembed';
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(customId)
        .setPlaceholder('اختر سيرفر...')
        .addOptions(guildOptions);
      const row = new ActionRowBuilder().addComponents(selectMenu);
      const embed = new EmbedBuilder()
        .setTitle('قائمة السيرفرات')
        .setDescription('اختر سيرفر من القائمة بالأسفل لعرض معلوماته.')
        .setColor(0x2980b9);
      if (getGuildSettings(interaction.guild?.id || interaction.guildId)?.embedImage) {
        embed.setImage(getGuildSettings(interaction.guild?.id || interaction.guildId)?.embedImage);
      }
      return interaction.update({ embeds: [embed], components: [row] });
    }
    if (selected.startsWith('dev_guildinfo_')) {
      const guildId = selected.split('_').pop();
      const guild = interaction.client.guilds.cache.get(guildId);
      if (!guild) {
        return interaction.reply({ content: '❌ لم يتم العثور على السيرفر.', ephemeral: true });
      }
      let ownerTag = 'غير معروف';
      let ownerId = 'غير معروف';
      try {
        const owner = await guild.fetchOwner();
        ownerTag = owner.user.tag;
        ownerId = owner.user.id;
      } catch {}
      let invite = 'غير متاح';
      try {
        const channels = guild.channels.cache.filter(c => c.type === 0 && c.permissionsFor(guild.members.me).has('CreateInstantInvite'));
        if (channels.size > 0) {
          const inviteObj = await channels.first().createInvite({ maxAge: 0, maxUses: 0, unique: true });
          invite = inviteObj.url;
        }
      } catch {}
      const embed = new EmbedBuilder()
        .setTitle(`معلومات السيرفر: ${guild.name}`)
        .setColor(0x27ae60)
        .addFields(
          { name: 'اسم السيرفر', value: guild.name, inline: true },
          { name: 'آيدي السيرفر', value: guild.id, inline: true },
          { name: 'أونر السيرفر', value: `<@${ownerId}> (${ownerTag})`, inline: false },
          { name: 'رابط الدعوة', value: invite, inline: false }
        )
        .setTimestamp();
      if (getGuildSettings(guildId)?.embedImage) {
        embed.setImage(getGuildSettings(guildId)?.embedImage);
      }
      let row = undefined;
      if (isChangeEmbed) {
        const changeEmbedBtn = {
          type: 2,
          style: 1,
          custom_id: `dev_change_embed_${guild.id}`,
          label: 'تغيير الايمبيد',
        };
        row = { type: 1, components: [changeEmbedBtn] };
      }
      await interaction.update({ embeds: [embed], components: row ? [row] : [] });
    }
  }
  // تفاعل زر تغيير الايمبيد في المطور
  if (interaction.isButton() && interaction.customId.startsWith('dev_change_embed_')) {
    if (!DEVELOPERS.includes(interaction.user.id)) {
      return interaction.reply({ content: '❌ هذا الإجراء مخصص فقط للمطورين.', ephemeral: true });
    }
    const guildId = interaction.customId.split('_').pop();
    // مودال إدخال رابط الايمبيد
    return interaction.showModal({
      custom_id: `modal_dev_set_embed_${guildId}`,
      title: 'تغيير رابط الايمبيد للسيرفر',
      components: [
        {
          type: 1,
          components: [
            {
              type: 4,
              custom_id: 'embed_image_url',
              label: 'رابط صورة الايمبيد الجديد',
              style: 1,
              min_length: 5,
              max_length: 300,
              required: true
            }
          ]
        }
      ]
    });
  }
  // استقبال بيانات المودالات وحفظها
  if (interaction.isModalSubmit()) {
    if (!interaction.guild) {
      return interaction.reply({ content: '❌ هذا الأمر متاح فقط داخل السيرفرات.', ephemeral: true });
    }
    if (!(await isAdmin(interaction))) {
      return interaction.reply({ content: '❌ هذا الإجراء مخصص فقط للأدمن.', ephemeral: true });
    }
    let settings = getGuildSettings(interaction.guild.id);
    try {
      if (interaction.customId === 'modal_set_game_room') {
        await interaction.deferReply({ ephemeral: true });
        const roomId = interaction.fields.getTextInputValue('game_room_id');
        settings.gameRoomId = roomId;
        saveGuildSettings(interaction.guild.id, settings);
        await sendLog(settings.logRoomId, interaction, `تم تعيين روم القيم إلى <#${roomId}>`);
        return interaction.editReply({ content: '✅ تم تعيين روم القيم بنجاح.' });
      } else if (interaction.customId === 'modal_set_vote_message') {
        await interaction.deferReply({ ephemeral: true });
        const text = interaction.fields.getTextInputValue('vote_text');
        const emoji = interaction.fields.getTextInputValue('vote_emoji');
        const roleId = interaction.fields.getTextInputValue('vote_role');
        settings.voteMessage.text = text;
        settings.voteMessage.emoji = emoji;
        settings.voteMessage.roleId = roleId;
        saveGuildSettings(interaction.guild.id, settings);
        await sendLog(settings.logRoomId, interaction, `تم تعيين رسالة التصويت إلى:\n**النص:** ${text}\n**الإيموجي:** ${emoji}\n**الرتبة:** <@&${roleId}>`);
        return interaction.editReply({ content: '✅ تم تعيين رسالة التصويت بنجاح.' });
      } else if (interaction.customId === 'modal_set_game_message') {
        await interaction.deferReply({ ephemeral: true });
        const text = interaction.fields.getTextInputValue('game_text');
        const link = interaction.fields.getTextInputValue('game_link');
        const code = interaction.fields.getTextInputValue('game_code');
        const roleId = interaction.fields.getTextInputValue('game_role');
        settings.gameMessage.text = text;
        settings.gameMessage.link = link;
        settings.gameMessage.code = code;
        settings.gameMessage.roleId = roleId;
        saveGuildSettings(interaction.guild.id, settings);
        await sendLog(settings.logRoomId, interaction, `تم تعيين رسالة القيم إلى:\n**النص:** ${text}\n**الكود:** ${code}\n**الرابط:** ${link}\n**الرتبة:** <@&${roleId}>`);
        return interaction.editReply({ content: '✅ تم تعيين رسالة القيم بنجاح.' });
      } else if (interaction.customId === 'modal_set_log_room') {
        await interaction.deferReply({ ephemeral: true });
        const oldLogRoomId = settings.logRoomId;
        const logRoomId = interaction.fields.getTextInputValue('log_room_id');
        settings.logRoomId = logRoomId;
        saveGuildSettings(interaction.guild.id, settings);
        await sendLog(logRoomId, interaction, `تم تعيين روم اللوق إلى <#${logRoomId}> بواسطة <@${interaction.user.id}>`);
        return interaction.editReply({ content: '✅ تم تعيين روم اللوق بنجاح.' });
      } else if (interaction.customId === 'modal_set_end_message') {
        await interaction.deferReply({ ephemeral: true });
        const text = interaction.fields.getTextInputValue('end_text');
        const roleId = interaction.fields.getTextInputValue('end_role');
        settings.endMessage.text = text;
        settings.endMessage.roleId = roleId;
        saveGuildSettings(interaction.guild.id, settings);
        await sendLog(settings.logRoomId, interaction, `تم تعيين نص انهاء القيم إلى:\n**النص:** ${text}\n**الرتبة:** <@&${roleId}>`);
        return interaction.editReply({ content: '✅ تم تعيين نص انهاء القيم بنجاح.' });
      }
    } catch (err) {
      console.error('خطأ أثناء معالجة بيانات المودال:', err);
      try {
        await interaction.editReply({ content: '❌ حدث خطأ أثناء حفظ البيانات.' });
      } catch {}
    }
  }
  // استقبال مودال تغيير الايمبيد من المطور
  if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_dev_set_embed_')) {
    if (!DEVELOPERS.includes(interaction.user.id)) {
      return interaction.reply({ content: '❌ هذا الإجراء مخصص فقط للمطورين.', ephemeral: true });
    }
    const guildId = interaction.customId.split('_').pop();
    const allSettings = loadSettingsAll();
    if (!allSettings[guildId]) allSettings[guildId] = {};
    const url = interaction.fields.getTextInputValue('embed_image_url');
    allSettings[guildId].embedImage = url;
    saveSettingsAll(allSettings);
    return interaction.reply({ content: `✅ تم تغيير رابط الايمبيد للسيرفر (${guildId}) بنجاح.`, ephemeral: true });
  }
  // تفاعل زر رؤية التعديلات في الإدارة
  if (interaction.isButton() && interaction.customId === 'admin_view_changes') {
    if (!(await isAdmin(interaction))) {
      return interaction.reply({ content: '❌ هذا الإجراء مخصص فقط للأدمن.', ephemeral: true });
    }
    const settings = getGuildSettings(interaction.guild.id);
    const embed = new EmbedBuilder()
      .setTitle('التعيينات الحالية')
      .setColor(0x5865F2)
      .addFields(
        { name: 'روم القيم', value: settings.gameRoomId ? `<#${settings.gameRoomId}>` : 'غير محدد', inline: false },
        { name: 'رسالة التصويت', value: settings.voteMessage?.text ? `النص: ${settings.voteMessage.text}\nالإيموجي: ${settings.voteMessage.emoji || 'غير محدد'}\nالرتبة: ${settings.voteMessage.roleId ? `<@&${settings.voteMessage.roleId}>` : 'غير محدد'}` : 'غير محدد', inline: false },
        { name: 'رسالة القيم', value: settings.gameMessage?.text ? `النص: ${settings.gameMessage.text}\nالرابط: ${settings.gameMessage.link || 'غير محدد'}\nالكود: ${settings.gameMessage.code || 'غير محدد'}\nالرتبة: ${settings.gameMessage.roleId ? `<@&${settings.gameMessage.roleId}>` : 'غير محدد'}` : 'غير محدد', inline: false },
        { name: 'نص إنهاء القيم', value: settings.endMessage?.text ? `النص: ${settings.endMessage.text}\nالرتبة: ${settings.endMessage.roleId ? `<@&${settings.endMessage.roleId}>` : 'غير محدد'}` : 'غير محدد', inline: false },
        { name: 'قناة اللوق', value: settings.logRoomId ? `<#${settings.logRoomId}>` : 'غير محدد', inline: false },
      );
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
  // تفاعل أزرار واجهة القيم
  if (interaction.isButton()) {
    if (!interaction.guild) {
      return interaction.reply({ content: '❌ هذا الأمر متاح فقط داخل السيرفرات.', ephemeral: true });
    }
    // تحقق من صلاحية الأدمن
    if (!(await isAdmin(interaction))) {
      return interaction.reply({ content: '❌ هذا الإجراء مخصص فقط للأدمن.', ephemeral: true });
    }
    const settings = getGuildSettings(interaction.guild.id);
    // تحقق من تعيين روم اللوق
    if (!settings.logRoomId) {
      return interaction.reply({ content: '❌ يجب تعيين روم اللوق أولاً من خلال الإدارة.', ephemeral: true });
    }
    const logChannel = await interaction.guild.channels.fetch(settings.logRoomId).catch(() => null);
    if (!logChannel) {
      return interaction.reply({ content: '❌ لم يتم العثور على روم اللوق. تحقق من صحة الآيدي.', ephemeral: true });
    }
    // دالة لوق فخم للأزرار
    async function sendButtonLog(type, details) {
      const embed = new EmbedBuilder()
        .setTitle('🔔 لوق تفاعل زر')
        .setColor(type === 'start_game' ? 0x00ff99 : type === 'start_vote' ? 0x3366ff : 0xff3333)
        .addFields(
          { name: 'العضو', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'نوع الزر', value: details, inline: true },
          { name: 'القناة', value: `<#${interaction.channel.id}> (ID: ${interaction.channel.id})`, inline: false },
          { name: 'التاريخ', value: `<t:${Math.floor(Date.now()/1000)}:F>`, inline: false }
        )
        .setFooter({ text: `Guild: ${interaction.guild.name} | ID: ${interaction.guild.id}` })
        .setTimestamp();
      if (settings.embedImage) {
        embed.setImage(settings.embedImage);
      }
      await logChannel.send({ embeds: [embed] });
    }
    // زر بدء قيم
    if (interaction.customId === 'start_game') {
      if (!settings.gameRoomId || !settings.gameMessage.text || !settings.gameMessage.link || !settings.gameMessage.code || !settings.gameMessage.roleId) {
        return interaction.reply({ content: '❌ يجب تعيين جميع إعدادات القيم أولاً من خلال الإدارة.', ephemeral: true });
      }
      const gameChannel = await interaction.guild.channels.fetch(settings.gameRoomId).catch(() => null);
      if (!gameChannel) {
        return interaction.reply({ content: '❌ لم يتم العثور على روم القيم. تحقق من صحة الآيدي.', ephemeral: true });
      }
      // إرسال رسالة القيم كنص عادي
      const mention = `<@&${settings.gameMessage.roleId}>`;
      const messageText = `**${settings.gameMessage.text}**\n\n**${settings.gameMessage.code}**\n\n**${settings.gameMessage.link}**\n\n${mention}`;
      try {
        await gameChannel.send(messageText);
        await interaction.reply({ content: '✅ تم إرسال رسالة القيم بنجاح.', ephemeral: true });
      } catch (err) {
        console.error('خطأ عند إرسال رسالة القيم:', err);
        await interaction.reply({ content: '❌ حدث خطأ أثناء إرسال رسالة القيم.', ephemeral: true });
      }
      // لا ترسل رسالة القيم في اللوق، فقط sendButtonLog
      await sendButtonLog('start_game', 'بدء قيم');
    }
    // زر بدء تصويت قيم
    else if (interaction.customId === 'start_vote') {
      if (!settings.voteMessage.text || !settings.voteMessage.emoji || !settings.voteMessage.roleId || !settings.gameRoomId) {
        return interaction.reply({ content: '❌ يجب تعيين رسالة التصويت وروم القيم والرتبة أولاً من خلال الإدارة.', ephemeral: true });
      }
      const gameChannel = await interaction.guild.channels.fetch(settings.gameRoomId).catch(() => null);
      if (!gameChannel) {
        return interaction.reply({ content: '❌ لم يتم العثور على روم القيم. تحقق من صحة الآيدي.', ephemeral: true });
      }
      // إرسال رسالة التصويت كنص عادي
      const mention = `<@&${settings.voteMessage.roleId}>`;
      const messageText = `**${settings.voteMessage.text}**\n\n${mention}`;
      let voteMsg;
      try {
        voteMsg = await gameChannel.send(messageText);
        console.log('تم إرسال رسالة التصويت:', voteMsg.id);
        // إضافة الإيموجي كرد فعل
        try {
          let emoji = settings.voteMessage.emoji;
          const customEmojiMatch = emoji.match(/^<a?:(\w+):(\d+)>$/);
          if (customEmojiMatch) {
            emoji = `${customEmojiMatch[1]}:${customEmojiMatch[2]}`;
          }
          await voteMsg.react(emoji);
          console.log('تمت إضافة الإيموجي:', emoji);
        } catch (err) {
          console.error('خطأ عند إضافة الإيموجي:', err);
        }
        await interaction.reply({ content: '✅ تم إرسال رسالة التصويت بنجاح.', ephemeral: true });
      } catch (err) {
        console.error('خطأ عند إرسال رسالة التصويت:', err);
        await interaction.reply({ content: '❌ حدث خطأ أثناء إرسال رسالة التصويت.', ephemeral: true });
      }
      // لا ترسل رسالة التصويت في اللوق، فقط sendButtonLog
      await sendButtonLog('start_vote', 'بدء تصويت قيم');
    }
    // زر إنهاء قيم
    else if (interaction.customId === 'end_game') {
      if (!settings.gameRoomId || !settings.endMessage.text || !settings.endMessage.roleId) {
        return interaction.reply({ content: '❌ يجب تعيين روم القيم ونص انهاء القيم والرتبة أولاً من خلال الإدارة.', ephemeral: true });
      }
      const gameChannel = await interaction.guild.channels.fetch(settings.gameRoomId).catch(() => null);
      if (!gameChannel) {
        return interaction.reply({ content: '❌ لم يتم العثور على روم القيم. تحقق من صحة الآيدي.', ephemeral: true });
      }
      let deleted = 0;
      try {
        const msgs = await gameChannel.messages.fetch({ limit: 100 });
        for (const msg of msgs.values()) {
          if (msg.deletable) {
            await msg.delete();
            deleted++;
          }
        }
      } catch (err) {
        console.error('خطأ عند حذف الرسائل:', err);
      }
      // إرسال رسالة انهاء القيم كنص عادي
      const mention = `<@&${settings.endMessage.roleId}>`;
      const messageText = `**${settings.endMessage.text}**\n\n${mention}`;
      try {
        await gameChannel.send(messageText);
        await interaction.reply({ content: `✅ تم إنهاء القيم وحذف ${deleted} رسالة.`, ephemeral: true });
      } catch (err) {
        console.error('خطأ عند إرسال رسالة انهاء القيم:', err);
        await interaction.reply({ content: '❌ حدث خطأ أثناء إرسال رسالة انهاء القيم.', ephemeral: true });
      }
      // لا ترسل رسالة انهاء القيم في اللوق، فقط sendButtonLog
      await sendButtonLog('end_game', 'إنهاء قيم');
    }
  }
  // تفاعل زر إيقاف/تشغيل البوت في المطور
  if (interaction.isButton() && (interaction.customId.startsWith('dev_stop_bot_') || interaction.customId.startsWith('dev_start_bot_'))) {
    if (!DEVELOPERS.includes(interaction.user.id)) {
      return interaction.reply({ content: '❌ هذا الإجراء مخصص فقط للمطورين.', ephemeral: true });
    }
    const guildId = interaction.customId.split('_').pop();
    const guild = interaction.client.guilds.cache.get(guildId);
    if (!guild) {
      return interaction.reply({ content: '❌ لم يتم العثور على السيرفر.', ephemeral: true });
    }
    const settings = getGuildSettings(guildId);
    if (interaction.customId.startsWith('dev_stop_bot_')) {
      // إيقاف البوت
      settings.botStopped = true;
      saveGuildSettings(guildId, settings);
      // تغيير اسم البوت
      try {
        await guild.members.me.setNickname(`${guild.members.me.displayName} (متوقف)`);
      } catch {}
      await interaction.reply({ content: '✅ تم إيقاف البوت في هذا السيرفر.', ephemeral: true });
    } else {
      // تشغيل البوت
      settings.botStopped = false;
      saveGuildSettings(guildId, settings);
      // إعادة الاسم الأصلي (يحذف (متوقف) فقط إذا كان موجوداً)
      try {
        const currentName = guild.members.me.displayName;
        const newName = currentName.replace(/ \(متوقف\)$/g, '');
        await guild.members.me.setNickname(newName);
      } catch {}
      await interaction.reply({ content: '✅ تم تشغيل البوت في هذا السيرفر.', ephemeral: true });
    }
  }
});

// ملاحظة: يمكن تغيير الايمبيد لاحقًا عبر أمر آخر سيتم إضافته لاحقًا

// إبقاء البوت نشطًا على استضافة Render
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot is running!'));
app.listen(PORT, () => console.log(`Web server running on port ${PORT}`));

client.login(TOKEN);

// دالة إرسال رسالة لوق
async function sendLog(logRoomId, interaction, description) {
  if (!logRoomId) return;
  try {
    const logChannel = await interaction.guild.channels.fetch(logRoomId).catch(() => null);
    if (!logChannel) return;
    await logChannel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle('توثيق إداري')
          .setDescription(`${description}\n\nتم بواسطة: <@${interaction.user.id}>`)
          .setColor(0xffcc00)
          .setTimestamp()
      ]
    });
  } catch (err) {
    console.error('خطأ عند إرسال اللوق الإداري:', err);
  }
} 