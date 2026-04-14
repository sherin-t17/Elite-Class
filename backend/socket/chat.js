module.exports = (io) => {
  const chatNamespace = io.of('/chat');

  chatNamespace.on('connection', (socket) => {
    console.log('User connected to chat:', socket.id);

    socket.on('join_context', (context) => {
      socket.join(`context:${context}`);
    });

    socket.on('send_message', (data) => {
      chatNamespace.to(`context:${data.context}`).emit('new_message', data);
    });

    socket.on('react', (data) => {
      chatNamespace.to(`context:${data.context}`).emit('reaction_updated', data);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });
};