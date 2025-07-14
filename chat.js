function initializeChat(companyId = null) {
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');
    const chatLoader = document.getElementById('chat-loader');
    const chatError = document.getElementById('chat-error');

    if (!chatForm) return;

    let messages = [{
        role: 'system',
        content: 'You are a helpful AI assistant specializing in business finance. Analyze the provided data to answer questions.'
    }];

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userInput = chatInput.value.trim();
        if (!userInput) return;

        appendMessage('user', userInput);
        messages.push({ role: 'user', content: userInput });
        chatInput.value = '';
        chatLoader.style.display = 'block';
        chatError.textContent = '';

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages, companyId }),
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`API Error: ${response.statusText} - ${errText}`);
            }

            const data = await response.json();
            const botReply = data.reply.content;
            appendMessage('bot', botReply);
            messages.push({ role: 'assistant', content: botReply });

        } catch (error) {
            console.error('Chat error:', error);
            chatError.textContent = `Error: ${error.message}`;
            // Remove the last user message if the API call failed
            messages.pop();
        } finally {
            chatLoader.style.display = 'none';
        }
    });

    function appendMessage(sender, message) {
        if (!chatMessages) return;
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', `${sender}-message`);
        // A simple markdown to HTML conversion
        messageElement.innerHTML = message
            .replace(/</g, "&lt;").replace(/>/g, "&gt;") // Sanitize HTML tags
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
            .replace(/\*(.*?)\*/g, '<em>$1</em>')       // Italics
            .replace(/`([^`]+)`/g, '<code>$1</code>')   // Inline code
            .replace(/\n/g, '<br>');                   // Newlines
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}