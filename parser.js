//  Маханов Константин
// docker run -d -p 4444:4444 --shm-size="2g" selenium/standalone-chrome:4.1.1-20211217

const {Builder, By, Key, until} = require('selenium-webdriver');
require('chromedriver');
const server = require("./server");

global.reviewList = [];

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

        await driver.get('https://2gis.ru/yaroslavl/search/%D0%A2%D0%B5%D0%BD%D0%B7%D0%BE%D1%80%2C%20%D0%BF%D1%80%D0%BE%D0%B4%D0%B0%D0%B6%D0%B0%20%D1%8D%D0%BB%D0%B5%D0%BA%D1%82%D1%80%D0%BE%D0%BD%D0%BD%D1%8B%D1%85%20%D0%BF%D0%BE%D0%B4%D0%BF%D0%B8%D1%81%D0%B5%D0%B9?m=39.896156%2C57.618178%2F12.21');

        // await driver.get('https://2gis.ru/yaroslavl/search/%D0%A6%D0%B2%D0%B5%D1%82%D1%82%D0%BE%D1%80%D0%B3?m=39.871883%2C57.603551%2F12.21');
        // await driver.get('https://2gis.ru/yaroslavl/search/%D0%BF%D1%8F%D1%82%D1%91%D1%80%D0%BE%D1%87%D0%BA%D0%B0?m=39.871883%2C57.603551%2F12.21');

        let addressElementsList = await driver.findElements(By.xpath("//span[@class='_tluih8']"));

        for (let addressEl of addressElementsList) {
            await getReviews(driver, await addressEl.getText(), await addressEl)
        }

    } finally {

        await console.log(reviewList);

        await parseReviews();

        await server.runServer();

        await console.log(`Результат: http://localhost:${global.port}`);

        await driver.quit();

        // await driver.get('http://127.0.0.1:3000/');
    }
})();

//  Формирует объект с адресами и отзывами и помещает их в массив reviewList
async function getReviews(driver, address, addressEl){

    let reviewInfo = {
        address: address,
        content: ['Отзывы отсутствуют']
    };

    try{
        // await driver.findElement(By.xpath(`//*[text()='${address}']`)).click();

        await addressEl.click();

        await driver.findElement(By.xpath("//a[text()='Отзывы']")).click();

        await driver.sleep(3000);
        await driver.wait(until.elementsLocated(By.xpath("//*[@class = '_11gvyqv']")), 3000);

        reviewInfo.content = await driver.findElements(By.xpath("//*[@class = '_11gvyqv']"));

        await driver.wait(async ()=>{
            for (let i = 0; i < reviewInfo.content.length; i++){
                reviewInfo.content[i] = await driver.wait(reviewInfo.content[i].getText());
            }
        });

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

