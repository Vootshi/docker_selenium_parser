/*  Маханов Константин
    Задание:
    Сложный пример: можно написать автоматизированную систему, которая разворачивается через docker,
     поднимает окружение с selenium или cef и эмитирует поведение пользователя - кликает по кнопкам, ходит по сайту,
     подключается к объектам UI фреймворка и достаёт данные из этих объектов.

    В качестве бонусного задания: выведите на страницу полученные данные в удобном виде с использованием bootstrap
     или аналогов.

    Использование:
    1) В терминале скачиваем образ и запускаем docker-контейнер, который хостит selenium/standalone-chrome, если порт 4444 занят,
        заменяем 4444:4444, например, на 4445:4444:
            docker run -d -p 4444:4444 --shm-size="2g" selenium/standalone-chrome:4.1.1-20211217
    2) npm install
    3) node .\parser.js
    4) Ожидаем завершения выполнения, переходим по ссылке в терминале, просматриваем результат.

    В комментариях к коду ниже указал моменты, которые можно доработать, чтобы отметить понимание.
    Не сделал изначально в целях экономии времени, по надобности могу доработать.

    Важно: Иногда не успевает считать все отзывы и выводит только часть, в этом случае просто перезапускаем:
        "node .\parser.js",
     не успел доработать все ожидания.
*/

// docker run -d -p 4444:4444 --shm-size="2g" selenium/standalone-chrome:4.1.1-20211217
// http://localhost:4444/wd/hub/static/resource/hub.html

var fs = require("fs");
var index = fs.readFileSync('index.html');

const express = require('express');
const app = express();
const port = 3000; //   Можно изменить, если порт занят

const {Builder, By, Key, until} = require('selenium-webdriver');
require('chromedriver')


// Передаём на клиент страницу index.html
app.get('/', (req, res) => {
    res.end(index)
});

// Обрабатываем запрос на получение массива отзывов
app.get('/reviews', (req, res) => {
    res.send({reviewList})
});

app.listen(port, () => {
    console.log('Успешно запущено, ожидайте завершения выполнения. После завершения в консоли отобразится ссылка на результат');
})

var reviewList = [];

//  Список адресов компании, отзывы которых хотим спарсить, в случае парсинга отзывов другой организации нужно менять адреса.
//  Можно доработать до поиска по классам и тогда парсер будет универсальным, нужно будет только менять ссылку на организацию
const addressList = ['Угличская, 36/44', 'Наумова, 20', 'Малая Пролетарская, 33', 'Свободы, 97', 'Угличская, 48'];

(async function parse() {

    //  Для работы с docker-контейнером
    try{
        var driver = await new Builder().forBrowser('chrome')
            .usingServer("http://localhost:4444/wd/hub/") // Узказываем standalone-сервер, который хостится docker-контейнером
            .build();
    }
    //  Для работы без docker-контейнера, возможно несоответсвие версии Chrome и chromedriver
    catch {
        var driver = await new Builder().forBrowser('chrome')
            // .usingServer("http://localhost:4444/wd/hub/")
            .build();
    }

    try {
        //  Ссылка на организацию, отзывы которой хотим получить, в текущей версии необходимо заменить и список адресов
        await driver.get('https://2gis.ru/yaroslavl/search/%D0%A2%D0%B5%D0%BD%D0%B7%D0%BE%D1%80%2C%20%D0%BF%D1%80%D0%BE%D0%B4%D0%B0%D0%B6%D0%B0%20%D1%8D%D0%BB%D0%B5%D0%BA%D1%82%D1%80%D0%BE%D0%BD%D0%BD%D1%8B%D1%85%20%D0%BF%D0%BE%D0%B4%D0%BF%D0%B8%D1%81%D0%B5%D0%B9?m=39.896156%2C57.618178%2F12.21');

        await driver.manage().window().maximize();

        for (let address of addressList) {
            await getReviews(driver, address);
        }

    } finally {
        // await driver.quit();
        await console.log(reviewList);

        await parseReviews();

        console.log(`Результат: http://localhost:${port}`)
        // await driver.get('http://127.0.0.1:3000/');
    }
})();

//  Помещает полученные объекты с адресами и отзывами в массив reviewList
async function getReviews(driver, address){

    let reviewInfo = {
        address: address,
        content: ['Отзывы отсутствуют']
    };

    try{
        await driver.findElement(By.xpath(`//*[text()='${address}']`)).click();
        await driver.findElement(By.xpath("//a[text()='Отзывы']")).click();

        await driver.wait(until.elementsLocated(By.xpath("//*[@class = '_11gvyqv']")), 6000);

        reviewInfo.content = await driver.findElements(By.xpath("//*[@class = '_11gvyqv']"));

        await driver.wait(async ()=>{
            for (let i = 0; i < reviewInfo.content.length; i++){
                reviewInfo.content[i] = await driver.wait(reviewInfo.content[i].getText());
            }
        }, 3000);

        reviewList.push(reviewInfo);
    } catch {
        reviewList.push(reviewInfo);
    }

}

//  Приводит полученный в ходе сбора массив отзывов в конечный вид, который будет передаваться для отображения
//  Можно доработать без замены на "уникальнные" наборы символов, на одних regex
//  Если трудно для понимания, можно разбить на функции
function parseReviews(){

    for (let post of reviewList) {
        for (let i = 0; i < post.content.length; i++) {
            post.content[i] = post.content[i].replace(/Полезно\n\d/, '-----------Answer----------')
                .replace(/\d+\sотзыв\W{0,2}/gm, '!!??&&%%');

            let reg = /^\w*\W*\n*^[A-Za-z0-9]*.*!!\?\?&&%%\s{0,2}\d{1,2}\s\W{3,8}\s\d{4}[,\n]\s*(отредактирован)*/gm;
            let matched = post.content[i].match(reg);

            if (matched){
                for (let myMatch of matched){
                    post.content[i] = post.content[i].replace(myMatch,'\n' + myMatch + '\n userInfo');
                }
            }

            let contentItem = post.content[i];

            //  Разделение содержимого отзыва на объект
            post.content[i] = {
                isReviewsEmpty: false,
                userInfo: '',   //  имя пользователя, дата отзывы
                userReview: '', //  отзыв пользователя
                companyAnswer: ''   // название организации, дата ответа, ответ организации
            }

            if (contentItem === 'Отзывы отсутствуют'){
                post.content[i].isReviewsEmpty = true;
            }
            else{
                post.content[i].userInfo = contentItem.slice(0, contentItem.indexOf('userInfo'))
                contentItem = contentItem.replace(post.content[i].userInfo + 'userInfo', '');

                post.content[i].userReview = contentItem.slice(0, contentItem.indexOf('-----------Answer----------'))
                contentItem = contentItem.replace(post.content[i].userReview + '-----------Answer----------', '');

                post.content[i].companyAnswer = contentItem;


                post.content[i].userInfo = post.content[i].userInfo.replace('!!??&&%%', '\n')
                    .replace(/\n/g, '<br>');

                post.content[i].userReview = post.content[i].userReview.replace(/\n/g, '<br>');

                post.content[i].companyAnswer =  post.content[i].companyAnswer.replace(/\n/g, '<br>');
            }
        }
    }
}

