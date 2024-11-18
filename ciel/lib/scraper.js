const axios = require('axios');
const cheerio = require('cheerio');
const FormData = require('form-data');

async function bytesToSize(bytes) {
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    if (bytes === 0) return "n/a";
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10);
    if (i === 0) return `${bytes} ${sizes[i]}`;
    return `${(bytes / 1024 ** i).toFixed(1)} ${sizes[i]}`;
}

async function mediafireDl(url) {
    return new Promise(async (resolve, reject) => {
        try {
            const res = await axios.get('https://r.jina.ai/' + url, {
                headers: { 'x-return-format': 'html' }
            });
            const data = res.data;
            const $ = cheerio.load(data);
            const link = $('a#downloadButton').attr('href');
            const size = $('a#downloadButton').text().replace('Download', '').replace('(', '').replace(')', '').trim();
            const upload_date = $('.dl-info .details li').last().find('span').text().trim();
            const name = $('div.dl-btn-label').attr('title') || link?.split('/')[5] || 'Unknown';
            const type = name.split('.')[1] || '';
            resolve({ name, type, upload_date, size, link });
        } catch (e) {
            reject(e);
        }
    });
}

async function pinterest(query) {
    return new Promise(async (resolve, reject) => {
        try {
            const baseUrl = 'https://www.pinterest.com/resource/BaseSearchResource/get/';
            const params = {
                source_url: '/search/pins/?q=' + encodeURIComponent(query),
                data: JSON.stringify({
                    options: {
                        isPrefetch: false,
                        query,
                        scope: 'pins',
                        no_fetch_context_on_resource: false
                    },
                    context: {}
                }),
                _: Date.now()
            };
            const headers = {
                'accept': 'application/json, text/javascript, */*, q=0.01',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'x-requested-with': 'XMLHttpRequest'
            };
            const { data } = await axios.get(baseUrl, { headers, params });
            const results = data.resource_response?.data?.results ?? [];
            const result = results.map(item => ({
                pin: 'https://www.pinterest.com/pin/' + item.id ?? '',
                link: item.link ?? '',
                id: item.id ?? '',
                images_url: item.images?.['736x']?.url ?? '',
                grid_title: item.grid_title ?? ''
            }));
            resolve(result);
        } catch (e) {
            reject([]);
        }
    });
}

async function remini(buffer, method = 'enhance') {
    return new Promise(async (resolve, reject) => {
        try {
            const form = new FormData();
            form.append('model_version', 1);
            form.append('image', buffer, { filename: 'enhance_image_body.jpg', contentType: 'image/jpeg' });
            const { data } = await axios.post('https://inferenceengine.vyro.ai/' + method, form, {
                headers: {
                    ...form.getHeaders(),
                    'accept-encoding': 'gzip',
                    'user-agent': 'Postify/1.0.0',
                },
                responseType: 'arraybuffer',
            });
            resolve(data);
        } catch (e) {
            reject(e);
        }
    });
}

async function styletext(teks) {
    return new Promise(async (resolve, reject) => {
        try {
            const { data } = await axios.get('http://qaz.wtf/u/convert.cgi?text=' + encodeURIComponent(teks));
            const $ = cheerio.load(data);
            const hasil = [];
            $('table > tbody > tr').each(function (a, b) {
                hasil.push({ 
                    name: $(b).find('td:nth-child(1) > span').text(), 
                    result: $(b).find('td:nth-child(2)').text().trim() 
                });
            });
            resolve(hasil);
        } catch (e) {
            reject(e);
        }
    });
}

async function ringtone(title) {
    return new Promise(async (resolve, reject) => {
        try {
            const { data } = await axios.get('https://meloboom.com/en/search/' + encodeURIComponent(title));
            const $ = cheerio.load(data);
            const hasil = [];
            $('#__next > main > section > div.jsx-2244708474.container > div > div > div > div:nth-child(4) > div > div > div > ul > li').each(function (a, b) {
                hasil.push({ 
                    title: $(b).find('h4').text(), 
                    source: 'https://meloboom.com/' + $(b).find('a').attr('href'), 
                    audio: $(b).find('audio').attr('src') 
                });
            });
            resolve(hasil);
        } catch (e) {
            reject(e);
        }
    });
}

async function wallpaper(title, page = '1') {
    return new Promise(async (resolve, reject) => {
        try {
            const { data } = await axios.get(`https://www.besthdwallpaper.com/search?CurrentPage=${page}&q=${encodeURIComponent(title)}`);
            const $ = cheerio.load(data);
            const hasil = [];
            $('div.grid-item').each(function (a, b) {
                hasil.push({
                    title: $(b).find('div.info > p').attr('title'),
                    type: $(b).find('div.info > a:nth-child(2)').text(),
                    source: 'https://www.besthdwallpaper.com' + $(b).find('a').attr('href'),
                    image: [
                        $(b).find('picture > img').attr('data-src') || $(b).find('picture > img').attr('src'),
                        $(b).find('picture > source:nth-child(1)').attr('srcset'),
                        $(b).find('picture > source:nth-child(2)').attr('srcset')
                    ]
                });
            });
            resolve(hasil);
        } catch (e) {
            reject(e);
        }
    });
}

async function wikimedia(title) {
    return new Promise(async (resolve, reject) => {
        try {
            const { data } = await axios.get(`https://commons.wikimedia.org/w/index.php?search=${encodeURIComponent(title)}&title=Special:MediaSearch&go=Go&type=image`);
            const $ = cheerio.load(data);
            const hasil = [];
            $('.sdms-search-results__list-wrapper > div > a').each(function (a, b) {
                hasil.push({ 
                    title: $(b).find('img').attr('alt'), 
                    source: $(b).attr('href'), 
                    image: $(b).find('img').attr('data-src') || $(b).find('img').attr('src') 
                });
            });
            resolve(hasil);
        } catch (e) {
            reject(e);
        }
    });
}

async function instagramDl(url) {
    return new Promise(async (resolve, reject) => {
        try {
            const { data } = await axios.post('https://yt1s.io/api/ajaxSearch', 
                new URLSearchParams({ q: url, w: '', p: 'home', lang: 'en' }), {
                headers: {
                    'Accept': 'application/json, text/plain, */*',
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'Origin': 'https://yt1s.io',
                    'Referer': 'https://yt1s.io/',
                    'User-Agent': 'Postify/1.0.0',
                }
            });
            const $ = cheerio.load(data.data);
            const result = $('a.abutton.is-success.is-fullwidth.btn-premium').map((_, b) => ({
                title: $(b).attr('title'),
                url: $(b).attr('href')
            })).get();
            resolve(result);
        } catch (e) {
            reject(e);
        }
    });
}

async function facebookDl(url) {
    return new Promise(async (resolve, reject) => {
        try {
            const { data } = await axios.post('https://getmyfb.com/process', new URLSearchParams({
                id: decodeURIComponent(url),
                locale: 'en',
            }), {
                headers: {
                    'hx-current-url': 'https://getmyfb.com/',
                    'hx-request': 'true',
                    'hx-target': url.includes('share') ? '#private-video-downloader' : '#target',
                    'hx-trigger': 'form',
                    'hx-post': '/process',
                    'hx-swap': 'innerHTML',
                }
            });
            const $ = cheerio.load(data);
            resolve({
                caption: $('.results-item-text').length > 0 ? $('.results-item-text').text().trim() : '',
                preview: $('.results-item-image').attr('src') || '',
                results: $('.results-list-item').get().map(el => ({
                    quality: parseInt($(el).text().trim()) || '',
                    type: $(el).text().includes('HD') ? 'HD' : 'SD',
                    url: $(el).find('a').attr('href') || '',
                }))
            });
        } catch (e) {
            reject(e);
        }
    });
}

async function instaStalk(username) {
    return new Promise(async (resolve, reject) => {
        try {
            const { data } = await axios.get('https://greatfon.com/v/' + username.toLowerCase(), {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            const $ = cheerio.load(data);
            const list_post = [];
            $('.card').each((a, b) => {
                const imageUrl = $(b).find('img').attr('src');
                const description = $(b).find('img').attr('alt')?.replace(/.*Instagram post:\s*/, '') || '';
                const detailUrl = 'https://greatfon.io' + $(b).find('a').attr('href');
                list_post.push({ imageUrl, description, detailUrl });
            });
            resolve({
                avatar: $('.avatar img').attr('src') || '',
                username: $('h1.text-4xl').text().trim() || '',
                nickname: $('h2.text-2xl').text().trim() || '',
                description: $('.text-sm.font-serif').text().trim() || '',
                posts: $('.stat').eq(0).find('.stat-value').text().trim() || 0,
                followers: $('.stat').eq(1).find('.stat-value').text().trim() || 0,
                following: $('.stat').eq(2).find('.stat-value').text().trim() || 0,
                list_post
            });
        } catch (e) {
            reject(e);
        }
    });
}

async function tiktokStalk(username) {
    return new Promise(async (resolve, reject) => {
        try {
            const headers = { 
                'referer': 'https://countik.com/user/@' + username, 
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' 
            };
            const { data } = await axios.get('https://www.tiktok.com/oembed?url=https://www.tiktok.com/@' + username);
            const { data: res } = await axios.get('https://countik.com/api/exist/' + username, { headers });
            const { data: wet } = await axios.get('https://countik.com/api/userinfo?sec_user_id=' + res.sec_uid, { headers });
            resolve({
                ...res,
                ...wet,
                author_name: data.author_name,
                author_url: data.author_url
            });
        } catch (e) {
            reject(e);
        }
    });
}

async function quotesAnime() {
    return new Promise(async (resolve, reject) => {
        try {
            const { data } = await axios.get('https://animechan.io/api/v1/quotes/random');
            resolve(data.data);
        } catch (e) {
            reject(e);
        }
    });
}

async function faktaUnik() {
    return new Promise(async (resolve, reject) => {
        try {
            const { data } = await axios.get('https://uselessfacts.jsph.pl/api/v2/facts/random');
            resolve(data.text);
        } catch (e) {
            reject(e);
        }
    });
}

module.exports = {
    bytesToSize,
    mediafireDl,
    pinterest,
    remini,
    styletext,
    ringtone,
    wallpaper,
    wikimedia,
    instagramDl,
    facebookDl,
    instaStalk,
    tiktokStalk,
    quotesAnime,
    faktaUnik
};
