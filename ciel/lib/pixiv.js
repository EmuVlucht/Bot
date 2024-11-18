const axios = require('axios');

async function pixivdl(query) {
    const isUrl = /https:\/\/(www\.)?pixiv\.net\/(en\/)?artworks\/[0-9]+/i.test(query);
    
    if (isUrl) {
        const id = query.replace(/\D/g, '');
        
        try {
            const response = await axios.get(`https://api.lolhuman.xyz/api/pixiv/${id}`, {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                timeout: 30000
            });
            
            if (response.data?.status === 200 && response.data?.result) {
                const data = response.data.result;
                return {
                    artist: data.user?.name || 'Unknown',
                    caption: data.title || 'No title',
                    tags: data.tags || [],
                    media: data.image || []
                };
            }
        } catch (e) {
            console.error('Pixiv API error:', e.message);
        }
        
        try {
            const fallback = await axios.get(`https://api.agatz.xyz/api/pixiv?id=${id}`, {
                timeout: 30000
            });
            
            if (fallback.data?.data) {
                const data = fallback.data.data;
                return {
                    artist: data.artist || 'Unknown',
                    caption: data.title || 'No title',
                    tags: data.tags || [],
                    media: Array.isArray(data.images) ? data.images : [data.image]
                };
            }
        } catch (e2) {
            console.error('Pixiv fallback error:', e2.message);
        }
        
        throw new Error(`ID "${id}" tidak ditemukan!`);
        
    } else {
        try {
            const searchResponse = await axios.get(`https://api.lolhuman.xyz/api/pixivsearch?query=${encodeURIComponent(query)}`, {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                timeout: 30000
            });
            
            if (searchResponse.data?.status === 200 && searchResponse.data?.result?.length) {
                const results = searchResponse.data.result;
                const random = results[Math.floor(Math.random() * results.length)];
                
                return {
                    artist: random.user?.name || 'Unknown',
                    caption: random.title || 'No title',
                    tags: random.tags || [],
                    media: random.image || []
                };
            }
        } catch (e) {
            console.error('Pixiv search error:', e.message);
        }
        
        try {
            const fallback = await axios.get(`https://api.agatz.xyz/api/pixivsearch?q=${encodeURIComponent(query)}`, {
                timeout: 30000
            });
            
            if (fallback.data?.data?.length) {
                const results = fallback.data.data;
                const random = results[Math.floor(Math.random() * results.length)];
                
                return {
                    artist: random.artist || 'Unknown',
                    caption: random.title || 'No title',
                    tags: random.tags || [],
                    media: Array.isArray(random.images) ? random.images : [random.image]
                };
            }
        } catch (e2) {
            console.error('Pixiv search fallback error:', e2.message);
        }
        
        throw new Error(`Tag "${query}" tidak ditemukan!`);
    }
}

module.exports = { pixivdl };
