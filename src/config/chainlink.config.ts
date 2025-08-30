export const CHAINLINK_CONFIG = {
  ethereum: {
    aggregatorV3: {
      ETHUSD: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
      BTCUSD: '0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c',
      LINKUSD: '0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c',
    },
    functions: {
      router: '0xA9d587a00A31A52Ed70D6026794a8FC5E2F5dCb0',
      donId: 'fun-ethereum-sepolia-1',
    },
    vrf: {
      coordinator: '0x271682DEB8C4E0901D1a1550aD2e64D568E69909',
      keyHash: '0x8af398995b04c28e9951adb9721ef74c74f93e6a478f39e7e0777be13527e7ef',
      subscriptionId: 0,
    },
    automation: {
      registry: '0x86EFBD0b6736Bed994962f9797049422A3A8E8Ad',
      registrar: '0x9a811502d843E5a03913d5A2cfb646c11463467A',
    },
  },
  base: {
    aggregatorV3: {
      ETHUSD: '0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70',
      USDCUSD: '0x7e860098F58bBFC8648a4311b374B1D669a2bc6B',
    },
    functions: {
      router: '0xf9B8fc078197181C841c296C876945aaa425B278',
      donId: 'fun-base-sepolia-1',
    },
  },
  arbitrum: {
    aggregatorV3: {
      ETHUSD: '0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612',
      BTCUSD: '0x6ce185860a4963106506C203335A2910413708e9',
    },
    functions: {
      router: '0x97083E831F8F0638855e2A515c90EdCF158DF238',
      donId: 'fun-arbitrum-sepolia-1',
    },
  },
};

export const CHAINLINK_JOBS = {
  musicTrendAnalysis: {
    source: `
      const apiUrl = 'https://api.spotify.com/v1/browse/categories';
      const response = await Functions.makeHttpRequest({
        url: apiUrl,
        headers: {
          'Authorization': 'Bearer ' + secrets.spotifyToken
        }
      });
      
      if (response.error) {
        throw Error('Request failed');
      }
      
      const data = response.data;
      const trendScore = calculateTrendScore(data.categories);
      
      return Functions.encodeUint256(Math.floor(trendScore * 100));
    `,
    expectedReturnType: 'uint256',
    secretsLocation: 0, // Inline
  },
  
  aiPerformanceEvaluation: {
    source: `
      const agentAddress = args[0];
      const projectHistory = args[1];
      
      // Analyze AI agent performance based on historical data
      let totalScore = 0;
      let completedProjects = 0;
      
      for (const project of JSON.parse(projectHistory)) {
        if (project.status === 'completed') {
          totalScore += project.qualityRating;
          completedProjects++;
        }
      }
      
      const averageScore = completedProjects > 0 ? totalScore / completedProjects : 0;
      return Functions.encodeUint256(Math.floor(averageScore * 100));
    `,
    expectedReturnType: 'uint256',
    secretsLocation: 0,
  },
  
  marketSentimentAnalysis: {
    source: `
      const twitterApiUrl = 'https://api.twitter.com/2/tweets/search/recent';
      const query = 'AI music collaboration blockchain';
      
      const response = await Functions.makeHttpRequest({
        url: twitterApiUrl + '?query=' + encodeURIComponent(query) + '&max_results=100',
        headers: {
          'Authorization': 'Bearer ' + secrets.twitterBearerToken
        }
      });
      
      if (response.error) {
        throw Error('Twitter API request failed');
      }
      
      const tweets = response.data.data || [];
      let positiveCount = 0;
      let totalCount = tweets.length;
      
      // Simple sentiment analysis
      for (const tweet of tweets) {
        const text = tweet.text.toLowerCase();
        const positiveWords = ['amazing', 'great', 'awesome', 'fantastic', 'love', 'excellent'];
        const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'disappointing'];
        
        let score = 0;
        positiveWords.forEach(word => {
          if (text.includes(word)) score++;
        });
        negativeWords.forEach(word => {
          if (text.includes(word)) score--;
        });
        
        if (score > 0) positiveCount++;
      }
      
      const sentimentScore = totalCount > 0 ? (positiveCount / totalCount) * 100 : 50;
      return Functions.encodeUint256(Math.floor(sentimentScore));
    `,
    expectedReturnType: 'uint256',
    secretsLocation: 0,
  }
};