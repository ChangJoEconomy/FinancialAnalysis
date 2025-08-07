require('dotenv').config();
const express = require('express');
const app = express();
const expressLayouts = require('express-ejs-layouts');
const dbConnect = require('./config/db');
const cookieParser = require('cookie-parser');

const PORT = process.env.PORT || 3000;

// 데이터베이스 연결
dbConnect();

// 뷰 엔진 설정
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set("views", __dirname + "/views");

// 미들웨어 설정
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// 정적파일
app.use(express.static('public'));

// 라우트 설정
app.use("/", require('./routes/main'));
app.use("/api", require('./routes/api'));

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});