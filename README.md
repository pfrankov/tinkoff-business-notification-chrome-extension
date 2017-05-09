# UNOFFICIAL Tinkoff Business notifier
Расширение для Хрома, оповещающее о любом движении средств или обновлении существующих транзакций в онлайн-банке [Tinkoff Business](http://sme.tinkoff.ru).

## Очень нужны пул-реквесты!

## Установка
1. Поскольку Хром запрещает установку расширений не из стора, придётся скачивать этот репозиторий `git clone https://github.com/pfrankov/tinkoff-business-notification-chrome-extension.git`
1. Заходим в список расширений [chrome://extensions](chrome://extensions)
1. Активируем `Developer mode`
1. Нажимаем `Load unpacked extension` и указываем путь до склонированного репозитория.

## Использование
1. Логинимся в [Tinkoff Business](http://sme.tinkoff.ru)
1. Закрываем вкладку с онлайн-банком, чтобы он не убил токен из-за отсутствия активности.

## Что там происходит?
1. При авторизации мы получаем токен, живущий 30 минут, с момента последнего продления.
1. Расширение самостоятельно продляет токен каждую минуту.
1. Если закрыть браузер или, скажем, отключиться от интернета более, чем на полчаса — токен протухнет.
Вы увидите соответствующую нотификацию.
1. Чтобы восстановить работу расширения, потребуется повторная авторизация. Расширение само подхватит новый токен.

### Зачем это всё, если есть СМС-оповещения?
Существует несколько кейсов, когда оповещения не приходят. Все они касаются валютных счетов.  
Когда команда Тинькофф запилит недостающие оповещения, это расширение перестанет быть нужным.

### У меня нет валютных счетов в Тинькове
Значит вам не имеет смысла ставить это расширение.

### Ээээ... А это безопасно вообще?
Категорически нет!  
Я крайне не рекомендую устанавливать любые расширения, которые запрашивают доступ к доменам онлайн-банка!  
Код этого экстеншна специально выложен на гитхаб, чтобы вы могли убедиться в отсутствии обращений к третим доменам.