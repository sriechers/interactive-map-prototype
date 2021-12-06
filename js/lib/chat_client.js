class ChatClient {
  constructor(server, options, callback){
    this.CHAT_SERVER_URI = server;
    this.options = options || {};
    this.options.scriptPath = options.hasOwnProperty('scriptPath') ? options.scriptPath : `${this.CHAT_SERVER_URI}/api/socket.io.js`;
    this.options.apiPath = options.hasOwnProperty('apiPath') ? options.apiPath : `/api`;
    this.options.chatContainer = options.hasOwnProperty('chatContainer') ? options.chatContainer : '.chat-wrapper';
    this.options.messageContainer = options.hasOwnProperty('messageContainer') ? options.messageContainer : '';
    this.options.sendContainer = options.hasOwnProperty('sendContainer') ? options.sendContainer : '';
    this.options.messageInput = options.hasOwnProperty('messageInput') ? options.messageInput : '';
    this.options.username = options.hasOwnProperty('username') ? options.username : false;
    this.options.onMessage = options.hasOwnProperty('onMessage') ? options.onMessage : null;
    this.callback = callback;
    this.socket = false;
    this.init();
  }
  init(){
    if(!this.options.username) throw new Error('No Valid Username provided');

    const initChatClient = new Promise((resolve, reject)=>{
      document.querySelector('#chat-server-script') && document.querySelector('#chat-server-script').remove();
      const script = document.createElement('script');
      script.id = 'chat-server-script';
      document.body.appendChild(script);
      script.onload = resolve;
      script.onerror = reject;
      script.async = true;
      // script.src = `${this.CHAT_SERVER_URI}/socket.io/socket.io.js`;
      script.src = this.options.scriptPath;
      
    })

    initChatClient.then(()=>{
      this.socket = io(this.CHAT_SERVER_URI,
      {
        path: this.options.apiPath
      })



    
      const name = this.options.username;
      this.appendMessage(`Du bist dem Chat beigetreten`, 'info')
      this.socket.emit('new-user', name)
      this.onConnection();
      
      // const scrolldummy = document.createElement('div');
      // scrolldummy.classList.add('chat-scrolldummy');
      // this.options.messageContainer.append(scrolldummy);

      this.socket.on('chat-message', data => {
        this.appendMessage(`${data.message}`, 'chatpartner');
        this.options.onMessage(data);
      })
    
      this.socket.on('user-connected', name => {
        this.appendMessage(`${name} verbunden`, 'info')
      })
    
      this.socket.on('user-disconnected', name => {
        this.appendMessage(`${name} hat den Chat verlassen`, 'info')
      })

      const sendCurrentClientMessage = () =>{
        const message = this.options.messageInput.value 
        if(message.length == 0) return;
        this.appendMessage(`${message}`, 'self')
        this.socket.emit('send-chat-message', message) 
        this.options.messageInput.value = ''
      }
    
      this.options.sendContainer.addEventListener('submit', (e) => {
        e.preventDefault()
        sendCurrentClientMessage();
      })

      this.options.messageInput.addEventListener('keyup', (e) => {
        if(e.keyCode === 13){
          e.preventDefault();
          sendCurrentClientMessage();
        }
      })
    })
    .catch((err)=>{
      console.error(err);
    })
  }
  disconnect(){
    this.socket.disconnect();
    this.options.messageContainer.innerHTML = '';
    // this.options.messageContainer.classList.add('disconnected');
  }
  appendMessage(message, user) {
    const messageElement = document.createElement('div')
    messageElement.classList.add('message');

    const date = new Date();
    messageElement.setAttribute('data-time', date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}));

    messageElement.innerHTML = `
    <p>${message}</p>
    `
    // messageElement.innerHTML = `
    // <img class="user-img" src="assets/user-profile.svg" alt="Chat Benutzer"/>
    // <p>${message}</p>
    // `
    messageElement.setAttribute('data-role', user);
    this.options.messageContainer.append(messageElement)

    messageElement.scrollIntoView({block: 'start', behavior: 'smooth'});
  }
  onConnection(){
    document.querySelector(this.options.chatContainer).classList.add('loaded');
    this.callback();
  }
}