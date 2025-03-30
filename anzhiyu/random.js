var posts=["2025/03/27/theory/","2025/03/27/小组作业/","2025/03/28/我对写作的看法/","2025/03/30/英语写作学习思考/"];function toRandomPost(){
    pjax.loadUrl('/'+posts[Math.floor(Math.random() * posts.length)]);
  };