let lanes = JSON.parse(localStorage.getItem("redditLanes")) || ['learnprogramming', 'javascript'];

const DOM = {
    lanesContainer: document.getElementById("lanesContainer"),
    addLaneBtn: document.getElementById("addLaneBtn"),
    popup: document.getElementById("popup"),
    popupInput: document.getElementById("popupInput"),
    popupError: document.getElementById("popupError"),
    popupSuggestions: document.getElementById("popupSuggestions")
};

function saveLanes() {
    localStorage.setItem("redditLanes", JSON.stringify(lanes));
}

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num;
}

function createLaneHTML(subreddit) {
    return `
        <div class="lane" id="lane-${subreddit}">
            <div class="lane-header">
                <h2>/r/${subreddit}</h2>
                <div class="lane-actions">
                    <button class="lane-btn refresh-btn" data-subreddit="${subreddit}">Refresh</button>
                    <button class="lane-btn delete-btn" data-subreddit="${subreddit}">Delete</button>
                </div>
            </div>
            <div class="lane-posts" id="posts-${subreddit}">
                <div class="loading">
                    <div class="spinner"></div>
                    <p>Loading posts from /r/${subreddit}...</p>
                </div>
            </div>
            <div class="lane-footer">
                <button class="visit-btn" data-subreddit="${subreddit}">Visit /r/${subreddit}</button>
            </div>
        </div>
    `;
}

async function loadSubredditPosts(subreddit) {
    const postsContainer = document.getElementById(`posts-${subreddit}`);
    
    try {
        postsContainer.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading posts...</p></div>';
        
        const response = await fetch(`https://corsproxy.io/?https://www.reddit.com/r/${subreddit}.json?limit=10`);
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        
        if (!data.data?.children?.length) throw new Error('No posts found');
        
        displayPosts(subreddit, data.data.children);
        
    } catch (error) {
        postsContainer.innerHTML = `
            <div class="error-state">
                <p>❌ Error loading /r/${subreddit}</p>
                <p><small>${error.message}</small></p>
                <button onclick="loadSubredditPosts('${subreddit}')" class="lane-btn">Try Again</button>
            </div>
        `;
    }
}

function displayPosts(subreddit, posts) {
    const postsContainer = document.getElementById(`posts-${subreddit}`);
    let html = '';
    
    posts.slice(0, 5).forEach(post => {
        const data = post.data;
        html += `
            <div class="post" onclick="window.open('https://reddit.com${data.permalink}', '_blank')">
                <h3>${data.title}</h3>
                <div class="post-meta">
                    <span>👤 ${data.author || 'Anonymous'}</span>
                    <span>⬆️ ${formatNumber(data.ups)}</span>
                    <span>💬 ${formatNumber(data.num_comments)}</span>
                </div>
            </div>
        `;
    });
    
    
    postsContainer.innerHTML = html;
}

function deleteLane(subreddit) {
    if (confirm(`Delete lane for /r/${subreddit}?`)) {
        lanes = lanes.filter(lane => lane !== subreddit);
        saveLanes();
        document.getElementById(`lane-${subreddit}`).remove();
    }
}

function normalizeSubredditName(input) {
    return input.trim()
        .toLowerCase()
        .replace(/^r\//, '')
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
}

function validateSubredditName(name) {
    if (!name) return 'Please enter a subreddit name';
    if (name.length < 2) return 'At least 2 characters';
    if (lanes.includes(name)) return `/r/${name} already exists`;
    return null;
}

async function addSubredditFromPopup() {
    const userInput = DOM.popupInput.value.trim();
    const subreddit = normalizeSubredditName(userInput);
    
    const error = validateSubredditName(subreddit);
    if (error) {
        DOM.popupError.textContent = error;
        return;
    }
    
    DOM.popupError.innerHTML = '<span style="color: #0079d3">Checking /r/' + subreddit + '...</span>';
    
    try {
        const response = await fetch(`https://corsproxy.io/?https://www.reddit.com/r/${subreddit}/about.json`);
        
        if (!response.ok) throw new Error(response.status === 404 ? 'Subreddit not found' : 'API error');
        
        lanes.push(subreddit);
        saveLanes();
        DOM.lanesContainer.innerHTML += createLaneHTML(subreddit);
        await loadSubredditPosts(subreddit);
        
        closePopup();
        
    } catch (error) {
        DOM.popupError.innerHTML = ` ${error.message}`;
    }
}

document.addEventListener('click', function(e) {
    const subreddit = e.target.dataset?.subreddit;
    if (!subreddit) return;
    
    if (e.target.classList.contains('refresh-btn')) loadSubredditPosts(subreddit);
    if (e.target.classList.contains('delete-btn')) deleteLane(subreddit);
    if (e.target.classList.contains('visit-btn')) window.open(`https://reddit.com/r/${subreddit}`, '_blank');
});

DOM.addLaneBtn.addEventListener('click', () => {
    DOM.popup.classList.remove('hidden');
    DOM.popupInput.focus();
    DOM.popupError.textContent = '';
    DOM.popupSuggestions.innerHTML = '';
});

function closePopup() {
    DOM.popup.classList.add('hidden');
    DOM.popupInput.value = '';
    DOM.popupError.textContent = '';
    DOM.popupSuggestions.innerHTML = '';
}

document.getElementById('popupCloseBtn').addEventListener('click', closePopup);
document.getElementById('popupAddBtn').addEventListener('click', addSubredditFromPopup);
DOM.popupInput.addEventListener('keypress', (e) => e.key === 'Enter' && addSubredditFromPopup());

async function initializeLanes() {
    if (lanes.length === 0) {
        DOM.lanesContainer.innerHTML = `
            <div style="text-align: center; padding: 50px; width: 100%; color: #666;">
                <h3>No subreddit lanes yet</h3>
                <p>Click the + button to add your first subreddit</p>
            </div>
        `;
        return;
    }
    
    DOM.lanesContainer.innerHTML = lanes.map(createLaneHTML).join('');
    lanes.forEach(subreddit => loadSubredditPosts(subreddit));
}
document.addEventListener('DOMContentLoaded', initializeLanes);