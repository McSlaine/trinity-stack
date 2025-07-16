function initializeChat() {
    // Show the chat interface
    const chatInterface = document.getElementById('chat-interface');
    if (chatInterface) {
        chatInterface.style.display = 'block';
    }
    
    // Get company ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const companyId = urlParams.get('id');
    
    // Set up chat form handler
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');
    const chatLoader = document.getElementById('chat-loader');
    const chatError = document.getElementById('chat-error');
    
    if (chatForm) {
        chatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const message = chatInput.value.trim();
            if (!message) return;
            
            // Clear input
            chatInput.value = '';
            chatError.textContent = '';
            
            // Add user message to chat
            addMessage(message, 'user');
            
            // Show loader
            chatLoader.style.display = 'block';
            
            try {
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: message,
                        companyId: companyId
                    })
                });
                
                if (!response.ok) {
                    throw new Error('Failed to get response');
                }
                
                const data = await response.json();
                
                // Add AI response to chat
                addMessage(data.reply, 'assistant');
                
            } catch (error) {
                console.error('Chat error:', error);
                chatError.textContent = 'Failed to get response. Please try again.';
            } finally {
                chatLoader.style.display = 'none';
            }
        });
    }
    
    function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${sender}`;
        messageDiv.innerHTML = `
            <div class="message-content">
                ${sender === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>'}
                <span>${escapeHtml(text)}</span>
            </div>
        `;
        chatMessages.appendChild(messageDiv);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Initialize with a welcome message
    addMessage("Hello! I'm your AI financial assistant. You can ask me about your invoices, bills, cashflow, or any financial questions about your company.", 'assistant');
}

// Call initialization when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeChat);
} else {
    initializeChat();
}
