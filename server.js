var fs = require("fs");
var index = fs.readFileSync('index.html');

const express = require('express');
const app = express();
global.port = 3000; //   Можно изменить, если порт занят

function runServer(){
    // Передаём на клиент страницу index.html
    app.get('/', (req, res) => {
        res.end(index)
    });

    // Обрабатываем запрос на получение массива отзывов
    app.get('/reviews', (req, res) => {
        res.send({reviewList});
    });

    app.listen(port, () => {
        console.log('Успешно запущено, ожидайте завершения выполнения. После завершения в консоли отобразится ссылка на результат');
    })
}

module.exports = {
    runServer: runServer
};