const axios = require('axios');
const cheerio = require('cheerio');
const FormData = require('form-data');

const tmate = {
    getToken: async () => {
        const config = {
            method: 'GET',
            url: 'https://tmate.cc/id',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Android 10; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/png,image/svg+xml,*/*;q=0.8',
                'accept-language': 'id-ID',
                'upgrade-insecure-requests': '1',
                'sec-fetch-dest': 'document',
                'sec-fetch-mode': 'navigate',
                'sec-fetch-site': 'none',
                'sec-fetch-user': '?1',
                'alt-used': 'tmate.cc',
                'priority': 'u=0, i',
                'te': 'trailers'
            }
        };

        const response = await axios.request(config);
        const html = response.data;
        const $ = cheerio.load(html);
        return $('input[name="token"]').val();
    },

    getData: async (url) => {
        const token = await tmate.getToken();
        const data = new FormData();
        data.append('url', url);
        data.append('token', token);

        const postConfig = {
            method: 'POST',
            url: 'https://tmate.cc/action',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Android 10; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0',
                'accept-language': 'id-ID',
                'content-type': `multipart/form-data; boundary=${data.getBoundary()}`,
                'referer': 'https://tmate.cc/id',
                'origin': 'https://tmate.cc',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-origin',
                'priority': 'u=0',
                'te': 'trailers'
            },
            data: data
        };

        const postResponse = await axios.request(postConfig);
        return postResponse.data;
    },

    download: async (url) => {
        const data = await tmate.getData(url);
        const result = data.data;
        const $ = cheerio.load(result);
        const mediaUrls = [];
        let isSlide = true;
        const downloadLinks = [];

        $('.abuttons a').each((index, element) => {
            const link = $(element).attr('href');
            const linkText = $(element).text().trim();
            if (linkText === 'Download without Watermark') {
                isSlide = false;
            }
            downloadLinks.push({ linkText, link });
        });

        if (isSlide) {
            mediaUrls.push(...extractImageUrls(result));
        }

        const title = $('h1[itemprop="name"] a').text().trim();
        const username = $('p span').text().trim();

        return {
            title,
            username,
            downloadLinks,
            mediaUrls,
            isSlide
        };
    }
};

function extractImageUrls(html) {
    const $ = cheerio.load(html);
    const images = [];
    $('img').each((index, element) => {
        const src = $(element).attr('src');
        if (src) {
            images.push(src);
        }
    });
    return images;
}

module.exports = { tmate };
