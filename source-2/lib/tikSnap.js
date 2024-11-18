const axios = require('axios');
const { CookieJar } = require('tough-cookie');
const wrapper = require('axios-cookiejar-support').wrapper;
const cheerio = require('cheerio');

class SavetikAPI {
  constructor() {
    this.cookieJar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.cookieJar,
      withCredentials: true
    }));
    this.csrfToken = "";
    this.userAgent = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36";
  }
  
  async fetchCsrfToken(url) {
    try {
      const response = await this.client.get(url, {
        headers: { "user-agent": this.userAgent }
      });
      
      const csrfMatch = response.data.match(/<meta name="csrf-token" content="([^"]+)">/);
      if (csrfMatch && csrfMatch[1]) {
        this.csrfToken = csrfMatch[1];
      } else {
        const cookieString = await this.cookieJar.getCookieString(url);
        const csrfCookieMatch = /XSRF-TOKEN=([^;]+)/.exec(cookieString);
        if (csrfCookieMatch && csrfCookieMatch[1]) {
          this.csrfToken = decodeURIComponent(csrfCookieMatch[1]);
        }
      }
    } catch (error) {
      console.error("Error fetching CSRF token:", error);
      throw error;
    }
  }
  
  async ajaxSearch(url, videoUrl) {
    try {
      if (!this.csrfToken) {
        await this.fetchCsrfToken("https://savetik.co/vi/douyin-downloader");
      }
      
      const response = await this.client.post(url, `q=${encodeURIComponent(videoUrl)}&lang=vi&cftoken=${this.csrfToken}`, {
        headers: {
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          "user-agent": this.userAgent,
          "x-requested-with": "XMLHttpRequest"
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
      console.error("Error in ajaxSearch:", error);
      throw error;
    }
  }
  
  async download({ url: videoUrl }) {
    try {
      const searchResult = await this.ajaxSearch("https://savetik.co/api/ajaxSearch", videoUrl);
      return searchResult;
    } catch (error) {
      console.error("Error during search and download:", error);
      throw error;
    }
  }
}

module.exports = SavetikAPI;