window.EC = window.EC || {};

EC.chat = {
  currentContext: 'class',
  quotedMsg: null,
  pollTimer: null,
  lastRenderedAt: 0,

  render(el, context) {
    if (!el) return;
    this.stopPolling();
    this.currentContext = context || 'class';

    el.innerHTML = `
      <div class="chat-main" style="height:100%;display:flex;flex-direction:column">
        <div class="chat-messages" id="chat-msg-list">
          <div class="empty-state"><div class="empty-icon">...</div><h3>Loading chat</h3><p>Please wait.</p></div>
        </div>
        <div id="chat-quoted-preview" style="display:none;padding:8px 18px;background:var(--surface);border-top:1px solid var(--border)">
          <div style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-muted)">
            <span id="chat-context-label">Replying to</span>
            <span id="chat-quoted-text" style="font-style:italic;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"></span>
            <button onclick="EC.chat.clearComposerState()" style="background:none;border:none;cursor:pointer;font-size:16px;color:var(--text-muted)">x</button>
          </div>
        </div>
        <div class="chat-input-bar">
          <button class="emoji-btn" onclick="EC.chat.insertEmoji('😊')">😊</button>
          <input class="chat-input" id="chat-input-field" placeholder="Type a message..." onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();EC.chat.send()}" />
          <button class="send-btn" onclick="EC.chat.send()">Send</button>
        </div>
      </div>
    `;

    this.syncComposerPreview();
    this.loadMessages();
    this.startPolling();
  },

  getMessages(context = this.currentContext) {
    const store = EC.state.chatMessagesByContext || {};
    return Array.isArray(store[context]) ? store[context] : [];
  },

  setMessages(context, messages) {
    if (!EC.state.chatMessagesByContext) EC.state.chatMessagesByContext = {};
    EC.state.chatMessagesByContext[context] = messages;
  },

  async loadMessages(options = {}) {
    const context = options.context || this.currentContext;
    const silent = Boolean(options.silent);

    try {
      const messages = await EC.api.getChatMessages(context);
      this.setMessages(context, messages);
      if (context === this.currentContext) {
        this.renderMessages();
        this.syncComposerPreview();
      }
    } catch (error) {
      if (!silent) {
        const list = document.getElementById('chat-msg-list');
        if (list) {
          list.innerHTML = `<div class="empty-state"><div class="empty-icon">!</div><h3>Chat unavailable</h3><p>${error.message || 'Could not load messages.'}</p></div>`;
        }
        EC.toast(error.message || 'Could not load class chat', 'danger');
      }
    }
  },

  renderMessages() {
    const list = document.getElementById('chat-msg-list');
    if (!list) return;

    const msgs = this.getMessages();
    const myId = String(EC.state.currentUser?.id || '');
    list.innerHTML = msgs.length
      ? msgs.map(message => this.renderMessage(message, myId)).join('')
      : `<div class="empty-state"><div class="empty-icon">💬</div><h3>No messages yet</h3><p>Be the first to say something.</p></div>`;

    this.lastRenderedAt = Date.now();
    this.scrollToBottom();
  },

  renderMessage(message, myId) {
    const isMe = String(message.fromId || '') === myId;
    const messageId = String(message.id).replace(/'/g, "\\'");
    const reactionCount = Number(message.reactionCount || 0);
    const reactionHtml = reactionCount
      ? `<div class="msg-reactions-bar"><span class="msg-react" onclick="EC.chat.react('${messageId}')">👍🏼 ${reactionCount}</span></div>`
      : '';

    return `
      <div class="chat-msg ${isMe ? 'me' : 'other'}">
        ${!isMe ? `<div class="msg-name">${message.role === 'teacher' ? '<span class="teacher-badge">Teacher</span>' : ''}${message.from}</div>` : ''}
        <div class="msg-bubble" ondblclick="EC.chat.quoteMsg('${messageId}')" title="Double-click to reply">
          ${message.quoted ? `<div class="msg-quoted">${message.quoted}</div>` : ''}
          ${message.text}
          <div class="msg-time">${message.time}</div>
        </div>
        <div style="display:flex;gap:4px;margin-top:2px">
          <button class="msg-react" onclick="EC.chat.react('${messageId}')" style="font-size:12px;background:none;border:none;cursor:pointer;opacity:0.7">👍🏼</button>
        </div>
        ${reactionHtml}
      </div>
    `;
  },

  async send() {
    const input = document.getElementById('chat-input-field');
    if (!input) return;

    const text = input.value.trim();
    if (!text) return;

    const payload = {
      context: this.currentContext,
      text
    };

    if (this.quotedMsg?.id) {
      payload.quoted = {
        messageId: this.quotedMsg.id,
        text: this.quotedMsg.text,
        from: this.quotedMsg.from
      };
    }

    try {
      const message = await EC.api.sendChatMessage(payload);
      const messages = this.getMessages().slice();
      messages.push(message);
      this.setMessages(this.currentContext, messages);
      input.value = '';
      this.clearComposerState({ keepInput: true });
      this.renderMessages();
    } catch (error) {
      EC.toast(error.message || 'Could not send message', 'danger');
    }
  },

  quoteMsg(id) {
    const msg = this.getMessages().find(entry => String(entry.id) === String(id));
    if (!msg) return;
    this.quotedMsg = msg;
    this.syncComposerPreview();
    document.getElementById('chat-input-field')?.focus();
  },

  clearComposerState(options = {}) {
    this.quotedMsg = null;
    if (!options.keepInput) {
      const input = document.getElementById('chat-input-field');
      if (input) input.value = '';
    }
    this.syncComposerPreview();
  },

  syncComposerPreview() {
    const preview = document.getElementById('chat-quoted-preview');
    const text = document.getElementById('chat-quoted-text');
    const contextLabel = document.getElementById('chat-context-label');
    if (!preview || !text || !contextLabel) return;

    if (!this.quotedMsg) {
      preview.style.display = 'none';
      text.textContent = '';
      contextLabel.textContent = 'Replying to';
      return;
    }

    preview.style.display = 'block';
    contextLabel.textContent = 'Replying to';
    text.textContent = `${this.quotedMsg.from}: ${this.quotedMsg.text}`;
  },

  async react(id) {
    try {
      const updated = await EC.api.reactChatMessage(id);
      const messages = this.getMessages().map(message =>
        String(message.id) === String(id)
          ? { ...message, reactionCount: updated.reactionCount }
          : message
      );
      this.setMessages(this.currentContext, messages);
      this.renderMessages();
    } catch (error) {
      EC.toast(error.message || 'Could not react to message', 'danger');
    }
  },

  insertEmoji(emoji) {
    const input = document.getElementById('chat-input-field');
    if (!input) return;
    input.value += emoji;
    input.focus();
  },

  startPolling() {
    this.stopPolling();
    this.pollTimer = window.setInterval(() => {
      if (EC.state.currentPage !== 'chat') return;
      this.loadMessages({ silent: true });
    }, 5000);
  },

  stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  },

  scrollToBottom() {
    setTimeout(() => {
      const list = document.getElementById('chat-msg-list');
      if (list) list.scrollTop = list.scrollHeight;
    }, 50);
  },

  taskContext(taskId) {
    return `task:${taskId}`;
  },

  announcementContext(annId) {
    return `announcement:${annId}`;
  }
};
