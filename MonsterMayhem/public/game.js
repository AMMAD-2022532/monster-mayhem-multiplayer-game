document.addEventListener('DOMContentLoaded', () => {
  const socket = io()

  socket.emit('joinGame', 'default')

  socket.on('stateUpdate', state => {
    console.clear()
    console.log('stateUpdate', state)
    render(state)
  })

  function render(state) {
   
    document.body.innerHTML = `
      <h1>Monster Mayhem State</h1>
      <pre>${JSON.stringify(state, null, 2)}</pre>
    `
  }
})
