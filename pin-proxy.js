const fs = require('fs');
const path = require('path');
const axios = require('axios');
const readline = require('readline');
const colors = require('colors');
const { HttpsProxyAgent } = require('https-proxy-agent');

class PinEye {
    headers(token = '') {
        const headers = {
            'Accept': 'application/json, text/plain, */*',
            'Accept-Encoding': 'gzip, deflate, br, zstd',
            'Accept-Language': 'vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5',
            'Content-Type': 'application/json',
            'Origin': 'https://app.pineye.io',
            'Referer': 'https://app.pineye.io/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    }

    async auth(userinfo, proxyUrl) {
        const url = 'https://api.pineye.io/api/v2/Login';
        const payload = { userinfo };

        try {
            const proxyAgent = new HttpsProxyAgent(proxyUrl);
            const response = await axios.post(url, payload, {
                headers: this.headers(''),
                timeout: 5000,
                proxy: false,
                httpsAgent: proxyAgent
            });
            return response.data;
        } catch (error) {
            this.log(`Error: ${error.message}`);
            return null;
        }
    }

    async getProfile(token, proxyUrl) {
        const url = 'https://api.pineye.io/api/v2/profile';
        try {
            const proxyAgent = new HttpsProxyAgent(proxyUrl);
            const response = await axios.get(url, {
                headers: this.headers(token),
                timeout: 5000,
                proxy: false,
                httpsAgent: proxyAgent
            });
            return response.data;
        } catch (error) {
            this.log(`Error: ${error.message}`);
            return null;
        }
    }

    async getBoosters(token, proxyUrl) {
        const url = 'https://api.pineye.io/api/v1/Booster';
        try {
            const proxyAgent = new HttpsProxyAgent(proxyUrl);
            const response = await axios.get(url, {
                headers: this.headers(token),
                timeout: 5000,
                proxy: false,
                httpsAgent: proxyAgent
            });
            return response.data;
        } catch (error) {
            this.log(`Salah blok: ${error.message}`);
            return null;
        }
    }

    async buyBooster(token, boosterId, proxyUrl) {
        const url = `https://api.pineye.io/api/v1/profile/BuyBooster?boosterId=${boosterId}`;
        try {
            const proxyAgent = new HttpsProxyAgent(proxyUrl);
            const response = await axios.post(url, {}, {
                headers: this.headers(token),
                timeout: 5000,
                proxy: false,
                httpsAgent: proxyAgent
            });
            return response.data;
        } catch (error) {
            this.log(`teu bisa di tingkatkeun ${boosterId}: ${error.message}`);
            return null;
        }
    }

    async manageBoosters(token, balance, proxyUrl) {
        const boostersData = await this.getBoosters(token, proxyUrl);
        if (!boostersData || !boostersData.data) {
            this.log('Henteu aya data jeung ningkatkeun!'.red);
            return;
        }

        for (const booster of boostersData.data) {
            while (balance >= booster.cost) {
                const result = await this.buyBooster(token, booster.id, proxyUrl);
                if (result && !result.errors) {
                    this.log(`Ditingkatkeun ${booster.title.yellow} Sukses aw. Balance: ${result.data.balance.toString().yellow}`);
                    balance = result.data.balance; 
                } else {
                    this.log(`Teu bisa meuli ${booster.title}.`);
                    break; 
                }
            }
        }
    }

    async tapEnergy(token, energy, proxyUrl) {
        const url = `https://api.pineye.io/api/v1/Tap?count=${energy}`;
        try {
            const proxyAgent = new HttpsProxyAgent(proxyUrl);
            const response = await axios.get(url, {
                headers: this.headers(token),
                timeout: 5000,
                proxy: false,
                httpsAgent: proxyAgent
            });
            if (response.data && !response.data.errors) {
                this.log(`Ketukan | Balance: ${response.data.data.balance.toString().white}`.magenta);
            }
        } catch (error) {
            this.log(`Ketukan sukses: ${error.message}`);
        }
    }

    async dailyReward(token, proxyUrl) {
        const url = 'https://api.pineye.io/api/v1/DailyReward';
        try {
            const proxyAgent = new HttpsProxyAgent(proxyUrl);
            const response = await axios.get(url, {
                headers: this.headers(token),
                timeout: 5000,
                proxy: false,
                httpsAgent: proxyAgent
            });
            if (response.data && response.data.data && response.data.data.canClaim) {
                const claimUrl = 'https://api.pineye.io/api/v1/DailyReward/claim';
                const claimResponse = await axios.post(claimUrl, {}, {
                    headers: this.headers(token),
                    timeout: 5000,
                    proxy: false,
                    httpsAgent: proxyAgent
                });
                if (claimResponse.data && !claimResponse.data.errors) {
                    this.log(`Hadir sukses | Balance: ${claimResponse.data.data.balance.toString().white}`.green);
                }
            } else {
                this.log('Nggeus check-in!'.yellow);
            }
        } catch (error) {
            this.log(`Gagal hadir: ${error.message}`);
        }
    }

    async checkProxyIP(proxy) {
        try {
            const proxyAgent = new HttpsProxyAgent(proxy);
            const response = await axios.get('https://api.ipify.org?format=json', {
                httpsAgent: proxyAgent
            });
            if (response.status === 200) {
                return response.data.ip;
            } else {
                throw new Error(`Salah IP proxy. Status code: ${response.status}`);
            }
        } catch (error) {
            throw new Error(`Proxy Error: ${error.message}`);
        }
    }

    log(msg) {
        console.log(`[*] ${msg}`);
    }

    async Countdown(seconds) {
        for (let i = seconds; i >= 0; i--) {
            readline.cursorTo(process.stdout, 0);
            process.stdout.write(`[*] Dagoan ${i} detik jeung ngalanjutkeun...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        console.log('');
    }

    extractFirstName(userinfo) {
        try {
            const decodedData = decodeURIComponent(userinfo);
    
            const userMatch = decodedData.match(/user=({.*?})/);
            if (userMatch && userMatch[1]) {
                const userObject = JSON.parse(userMatch[1]);
    
                return userObject.first_name;
            } else {
                this.log('[*] Gagal nempo nama hareup.');
                return 'Unknown';
            }
        } catch (error) {
            this.log(`[*] Gagal nempo nama hareup: ${error.message}`);
            return 'Unknown';
        }
    }    

    askQuestion(query) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise(resolve => rl.question(query, ans => {
            rl.close();
            resolve(ans);
        }));
    }

    async checkAndBuyLottery(token, proxyUrl) {
        const url = 'https://api.pineye.io/api/v1/Lottery';
        try {
            const proxyAgent = new HttpsProxyAgent(proxyUrl);
            const response = await axios.get(url, {
                headers: this.headers(token),
                timeout: 5000,
                proxy: false,
                httpsAgent: proxyAgent
            });
            const { ticket, lotteryRule } = response.data.data;
            if (!ticket.hasBuyed) {
                const buyTicketUrl = 'https://api.pineye.io/api/v1/Lottery/BuyTicket';
                const buyResponse = await axios.post(buyTicketUrl, {}, {
                    headers: this.headers(token),
                    timeout: 5000,
                    proxy: false,
                    httpsAgent: proxyAgent
                });
                const { code, balance } = buyResponse.data.data;
                this.log(`Berhasil meuli tiket judi ${code.toString().white} | Balance : ${balance.toString().white}`.magenta);
            } else {
                this.log(`Geus meuli tiket: ${ticket.code.toString().white}`.yellow);
            }
        } catch (error) {
            this.log(`Saldo kurang kehed!`.red);
        }
    }

    async main() {
        const dataFile = path.join(__dirname, 'data.txt');
        const userData = fs.readFileSync(dataFile, 'utf8')
            .replace(/\r/g, '')
            .split('\n')
            .filter(Boolean);

        const proxyFile = path.join(__dirname, 'proxy.txt');
        const proxyData = fs.readFileSync(proxyFile, 'utf8')
            .replace(/\r/g, '')
            .split('\n')
            .filter(Boolean);

        const nangcapturbo = await this.askQuestion('Bạn có muốn nâng cấp boosters không? (y/n): ');
        const hoiturbo = nangcapturbo.toLowerCase() === 'y';

        const muaveso = await this.askQuestion('Bạn có muốn mua lottery không? (y/n): ');
        const hoiveso = muaveso.toLowerCase() === 'y';

        this.log(`Ieu Bot Jieunan Dan Cay Airdrop!`.magenta);

        while (true) {
            for (let i = 0; i < userData.length; i++) {
                const userinfo = userData[i];
                const proxyUrl = proxyData[i];
                const first_name = this.extractFirstName(userinfo);

                try {
                    const proxyIP = await this.checkProxyIP(proxyUrl);
                    console.log(`========== Rek ${i + 1} | ${first_name.green} | Proxy IP: ${proxyIP.white} ==========`);

                    const apiResponse = await this.auth(userinfo, proxyUrl);
                    if (apiResponse && apiResponse.data && apiResponse.data.token) {
                        const token = apiResponse.data.token;
                        const profileResponse = await this.getProfile(token, proxyUrl);
                        if (profileResponse && profileResponse.data) {
                            const { totalBalance, level, earnPerTap } = profileResponse.data.profile;
                            const { maxEnergy, currentEnergy } = profileResponse.data.energy;

                            this.log(`Balance: ${totalBalance.toString().white}`.green);
                            this.log(`Lv: ${level.toString().white}`.green);
                            this.log(`Earn Per Tap: ${earnPerTap.toString().white}`.green);
                            this.log(`Energi: ${currentEnergy.toString().white} / ${maxEnergy.toString().white}`.green);

                            if (currentEnergy > 0) {
                                await this.tapEnergy(token, currentEnergy, proxyUrl);
                            }

                            await this.dailyReward(token, proxyUrl);
                            if (hoiturbo) {
                                await this.manageBoosters(token, totalBalance, proxyUrl);
                            }
                            if (hoiveso) {
                                await this.checkAndBuyLottery(token, proxyUrl);
                            }
                        } else {
                            this.log(`Gagal menangkeun data: ${profileResponse ? profileResponse.errors : 'No response data'}`);
                        }
                    } else {
                        this.log(`Gagal login: ${apiResponse ? apiResponse.errors : 'No response data'}`);
                    }
                } catch (error) {
                    this.log(`Salah akun ${i + 1}: ${error.message}`.red);
                    continue;
                }
            }
            await this.Countdown(60);
        }
    }
}

if (require.main === module) {
    const pineye = new PinEye();
    pineye.main().catch(err => {
        console.error(err.toString().red);
        process.exit(1);
    });
}