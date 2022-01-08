Задание:

    Сложный пример: можно написать автоматизированную систему, которая разворачивается через docker,
    поднимает окружение с selenium или cef и эмитирует поведение пользователя - кликает по кнопкам, ходит по сайту,
    подключается к объектам UI фреймворка и достаёт данные из этих объектов.
    В качестве бонусного задания: выведите на страницу полученные данные в удобном виде с использованием bootstrap
     или аналогов.

Использование:

    1) В терминале скачиваем образ и запускаем docker-контейнер, который хостит selenium/standalone-chrome.
    Если порт 4444 занят, заменяем 4444:4444, например, на 4445:4444:
       docker run -d -p 4444:4444 --shm-size="2g" selenium/standalone-chrome:4.1.1-20211217
    2) npm install
    3) node .\parser.js
    4) Ожидаем завершения выполнения, переходим по ссылке в терминале, просматриваем результат.

Важно: Иногда происходят артефакты с пагинацией и выводится только часть отзывов, в этом случае просто перезапускаем:
    
    node .\parser.js

Тоже важно: Работает и на других организациях, но нужно дорабатывать обходы пагинации, иначе будет выдавать только видимые данные.