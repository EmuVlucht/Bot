const axios = require('axios');
const cheerio = require('cheerio');

class SavetikAPI {
    constructor() {
        this.csrfToken = "";
        this.userAgent = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36";
        this.cookies = "";
    }
    
    async fetchCsrfToken(url) {
        try {
            const response = await axios.get(url, {
                headers: { 
                    "user-agent": this.userAgent,
                    "Cookie": this.cookies
                }
            });
            
            const setCookies = response.headers['set-cookie'];
            if (setCookies) {
                this.cookies = setCookies.map(c => c.split(';')[0]).join('; ');
            }
            
            const csrfMatch = response.data.match(/<meta name="csrf-token" content="([^"]+)">/);
            if (csrfMatch && csrfMatch[1]) {
                this.csrfToken = csrfMatch[1];
            } else {
                const csrfCookieMatch = /XSRF-TOKEN=([^;]+)/.exec(this.cookies);
                if (csrfCookieMatch && csrfCookieMatch[1]) {
                    this.csrfToken = decodeURIComponent(csrfCookieMatch[1]);
                }
            }
        } catch (error) {
            console.error("Error fetching CSRF token:", error.message);
            throw error;
        }
    }
    
    async ajaxSearch(url, videoUrl) {
        try {
            if (!this.csrfToken) {
                await this.fetchCsrfToken("https://savetik.co/vi/douyin-downloader");
            }
            
            const response = await axios.post(url, `q=${encodeURIComponent(videoUrl)}&lang=vi&cftoken=${this.csrfToken}`, {
                headers: {
                    "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                    "user-agent": this.userAgent,
                    "x-requested-with": "XMLHttpRequest",
                    "Cookie": this.cookies
                }
            });
            
            const $ = cheerio.load(response.data.data);
            const videoTitle = $("div.video-data h3").text().trim();
            const thumbnailUrl = $("div.thumbnail img").attr("src");
            const downloadLinks = $("div.dl-action a").map((index, element) => {
                return {
                    text: $(element).text().trim(),
                    link: $(element).attr("href")
                };
            }).get();
            
            return {
                status: "ok",
                videoTitle,
                thumbnailUrl,
                downloadLinks
            };
        } catch (error) {
            console.error("Error in ajaxSearch:", error.message);
            throw error;
        }
    }
    
    async download({ url: videoUrl }) {
        try {
            const searchResult = await this.ajaxSearch("https://savetik.co/api/ajaxSearch", videoUrl);
            return searchResult;
        } catch (error) {
            console.error("Error during search and download:", error.message);
            throw error;
        }
    }
}

module.exports = SavetikAPI;
