VK.init({
    apiId: 6328105
});

function auth() {
    return new Promise( function(resolve, reject) {
        VK.Auth.login( function(data) {
            if (data.session) {
                resolve();
            } else {
                reject(new Error('Не удалось авторизоваться'));
            }
        }, 2);
    });
}

function callAPI(method, params) {
    params.v = '5.69';

    return new Promise( function(resolve, reject) {
        VK.api(method, params, function(data) {
            if (data.error) {
                reject(data.error);
            } else {
                resolve(data.response);
            }
        });
    });
}

const list = document.querySelector('.friends-list');
const addedList = document.querySelector('.list__added');
const button = document.querySelector('.button');
const leftFilterInput= document.querySelector('.left-col__input');
const rightFilterInput = document.querySelector('.right-col__input');
let friends = {};
let addedFriendsArr = [];

( async () => {
    try {
        await auth();

        friends = await callAPI('friends.get', { fields: 'photo_50' });
        friends = friends.items;

        if (!localStorage.getItem('friends')) {
            showFriends(friends, 'leftCol');
        } else {
            addedFriendsArr = JSON.parse(localStorage.getItem('friends'));

            for(let i = 0, len = addedFriendsArr.length; i < len; i++) {
                for(let j = 0, len1 = friends.length; j < len1; j++) {

                    if(addedFriendsArr[i].id == friends[j].id) {
                        friends.splice(j, 1);
                        len1--;
                    }
                }
            }
            showFriends(friends, 'leftCol');
            showFriends(addedFriendsArr, 'rightCol');
        }
} catch (e) {
    console.error(e);
}
})();

list.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopImmediatePropagation();

    if (e.target.id) {
        addToAddedList(e.target.id);
    }
});

addedList.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopImmediatePropagation();

    if (e.target.id) {
        returnFromAddedList(e.target.id);
    }
});

button.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopImmediatePropagation();

    if (localStorage.getItem('friends')) {
        localStorage.removeItem('friends');
    }
    if (addedFriendsArr.length) {
        localStorage.setItem('friends', JSON.stringify(addedFriendsArr));
    }
});

leftFilterInput.addEventListener('keyup', () => {
    let inputVal = leftFilterInput.value;

    if (inputVal) {
        filterShow(friends, inputVal, list, 'leftCol');
    } else {
        list.innerHTML = '';
        showFriends(friends, 'leftCol');
    }
});

rightFilterInput.addEventListener('keyup', () => {
    if(addedFriendsArr.length) {
        let inputVal = rightFilterInput.value;

        if (inputVal) {
            filterShow(addedFriendsArr, inputVal, addedList, 'rightCol');
        } else {
            addedList.innerHTML = '';
            showFriends(addedFriendsArr, 'rightCol');
        }
    }
});

let DragManager = new function() {

    /**
     * составной объект для хранения информации о переносе:
     * {
   *   elem - элемент, на котором была зажата мышь
   *   id - цифровое id друга
   *   avatar - аватар
   *   downX/downY - координаты, на которых был mousedown
   *   shiftX/shiftY - относительный сдвиг курсора от угла элемента
   *   parent - родитель элемента
   * }
     */
    let dragObject = {};

    let self = this;

    function onMouseDown(e) {

        if (e.which != 1) return;

        let elem = e.target.closest('.draggable');
        if (!elem) return;

        dragObject.elem = elem;

        let id = elem.id;

        dragObject.id = id.slice(3);
        dragObject.parent = elem.closest('.droppable');

        // запомним, что элемент нажат на текущих координатах pageX/pageY
        dragObject.downX = e.pageX;
        dragObject.downY = e.pageY;

        return false;
    }

    function onMouseMove(e) {
        if (!dragObject.elem) return; // элемент не зажат

        if (!dragObject.avatar) { // если перенос не начат...
            let moveX = e.pageX - dragObject.downX;
            let moveY = e.pageY - dragObject.downY;

            // если мышь передвинулась в нажатом состоянии недостаточно далеко
            if (Math.abs(moveX) < 3 && Math.abs(moveY) < 3) {
                return;
            }

            // начинаем перенос
            dragObject.avatar = createAvatar(e); // создать аватар
            if (!dragObject.avatar) { // отмена переноса, нельзя "захватить" за эту часть элемента
                dragObject = {};
                return;
            }

            // аватар создан успешно
            // создать вспомогательные свойства shiftX/shiftY
            let coords = getCoords(dragObject.avatar);
            dragObject.shiftX = dragObject.downX - coords.left;
            dragObject.shiftY = dragObject.downY - coords.top;

            startDrag(e); // отобразить начало переноса
        }

        // отобразить перенос объекта при каждом движении мыши
        dragObject.avatar.style.left = e.pageX - dragObject.shiftX + 'px';
        dragObject.avatar.style.top = e.pageY - dragObject.shiftY + 'px';

        return false;
    }

    function onMouseUp(e) {
        if (dragObject.avatar) { // если перенос идет
            finishDrag(e);
        }

        // перенос либо не начинался, либо завершился
        // в любом случае очистим "состояние переноса" dragObject
        dragObject = {};
    }

    function finishDrag(e) {
        let dropElem = findDroppable(e);

        if (!dropElem) {
            self.onDragCancel(dragObject);
        } else {
            if (dropElem == dragObject.parent) {
                self.onDragCancel(dragObject);
            } else {
                self.onDragEnd(dragObject, dropElem);
            }
        }
    }

    function createAvatar(e) {

        // запомнить старые свойства, чтобы вернуться к ним при отмене переноса
        let avatar = dragObject.elem;
        let old = {
            parent: avatar.parentNode,
            nextSibling: avatar.nextSibling,
            position: avatar.position || '',
            left: avatar.left || '',
            top: avatar.top || '',
            zIndex: avatar.zIndex || '',
            fontSize: avatar.fontSize || ''
        };

        // функция для отмены переноса
        avatar.rollback = function() {
            old.parent.insertBefore(avatar, old.nextSibling);
            avatar.style.position = old.position;
            avatar.style.left = old.left;
            avatar.style.top = old.top;
            avatar.style.zIndex = old.zIndex;
            avatar.style.fontSize = old.fontSize;
        };

        return avatar;
    }

    function startDrag(e) {
        let avatar = dragObject.avatar;

        // инициировать начало переноса
        document.body.appendChild(avatar);
        avatar.style.zIndex = 9999;
        avatar.style.position = 'absolute';
        avatar.style.width = '280px';
        avatar.style.fontFamily = 'fira_sansmedium, sans-serif';
        avatar.style.fontSize = '0.75em';
        avatar.style.fontWeight = 'bold';
    }

    function findDroppable(event) {
        // спрячем переносимый элемент
        dragObject.avatar.hidden = true;

        // получить самый вложенный элемент под курсором мыши
        let elem = document.elementFromPoint(event.clientX, event.clientY);

        // показать переносимый элемент обратно
        dragObject.avatar.hidden = false;

        if (elem == null) {
            // такое возможно, если курсор мыши "вылетел" за границу окна
            return null;
        }

        return elem.closest('.droppable');
    }

    document.onmousemove = onMouseMove;
    document.onmouseup = onMouseUp;
    document.onmousedown = onMouseDown;

    this.onDragEnd = function(dragObject, dropElem) {
        if (dropElem == addedList) {
            console.log('Это правая колонка');
            addToAddedList(dragObject.id);
        }
        if (dropElem == list) {
            console.log('Это левая колонка');
            returnFromAddedList(dragObject.id);
        }
        document.body.removeChild(dragObject.avatar);
        dragObject = {};
    };
    this.onDragCancel = function(dragObject) {
        dragObject.avatar.rollback();
    };

};

function addToAddedList(id) {
    friends = friends.filter(function (el) {

        if (el.id != id) {
            return true;
        }
        addedFriendsArr.push(el);

        return false;
    });

    list.innerHTML = '';
    addedList.innerHTML = '';

    if (leftFilterInput.value) {
        filterShow(friends, leftFilterInput.value, list, 'leftCol');
        showFriends(addedFriendsArr, 'rightCol');
    }
    if (rightFilterInput.value) {
        showFriends(friends, 'leftCol');
        filterShow(addedFriendsArr, rightFilterInput.value, addedList, 'rightCol');
    }
    if (leftFilterInput.value && rightFilterInput.value) {
        filterShow(friends, leftFilterInput.value, list, 'leftCol');
        filterShow(addedFriendsArr, rightFilterInput.value, addedList, 'rightCol');
    }
    if (!leftFilterInput.value && !rightFilterInput.value) {
        showFriends(friends, 'leftCol');
        showFriends(addedFriendsArr, 'rightCol');
    }
}

function returnFromAddedList(id) {
    addedFriendsArr = addedFriendsArr.filter(function (el) {

        if (el.id != id) {
            return true;
        }
        friends.push(el);

        return false;
    });

    list.innerHTML = '';
    addedList.innerHTML = '';

    if (rightFilterInput.value) {
        showFriends(friends, 'leftCol');
        filterShow(addedFriendsArr, rightFilterInput.value, addedList, 'rightCol');
    }
    if (leftFilterInput.value) {
        filterShow(friends, leftFilterInput.value, list, 'leftCol');
        showFriends(addedFriendsArr, 'rightCol');
    }
    if (leftFilterInput.value && rightFilterInput.value) {
        filterShow(friends, leftFilterInput.value, list, 'leftCol');
        filterShow(addedFriendsArr, rightFilterInput.value, addedList, 'rightCol');
    }
    if (!leftFilterInput.value && !rightFilterInput.value) {
        showFriends(friends, 'leftCol');
        showFriends(addedFriendsArr, 'rightCol');
    }
}

function filterShow(array, inputValue, elem, indexCol) {
    let resultArr = [];
    if (inputValue) {
        array.forEach((el) => {
            let fullName = `${el.first_name} ${el.last_name}`;
            if (isMatching(fullName, inputValue)) resultArr.push(el);
        });
        if (resultArr.length) {
            elem.innerHTML = '';
            showFriends(resultArr, indexCol);
        } else {
            elem.innerHTML = '';
        }
    }
}

function isMatching(full, chunk) {
    chunk = chunk.toLowerCase();
    full = full.toLowerCase();

    if (full.indexOf(chunk) == -1) { return false; }

    return true;
}

function showFriends(friends, key) {
    for (let i = 0, len = friends.length; i < len; i++) {
        let li = document.createElement('li'),
            divImg = document.createElement('div'),
            img = document.createElement('img'),
            divName = document.createElement('div'),
            a = document.createElement('a');

        li.id = `li-${friends[i].id}`;
        divImg.className = 'img-wr';
        img.className = 'img';
        divName.className = 'name';

        if (key === 'leftCol') {
            li.className = 'list__item list__item_add draggable';
            a.className = 'link add-link';

            list.appendChild(li);
        }
        if (key === 'rightCol') {
            li.className = 'list__item list__item_remove draggable';
            a.className = 'link remove-link';

            addedList.appendChild(li);
        }
        img.src = `${friends[i].photo_50}`;
        divName.textContent = `${friends[i].first_name} ${friends[i].last_name}`;
        a.id = `${friends[i].id}`;

        divImg.appendChild(img);
        li.appendChild(divImg);
        li.appendChild(divName);
        li.appendChild(a);
    }
}

function getCoords(elem) { // кроме IE8-
    let box = elem.getBoundingClientRect();

    return {
        top: box.top + pageYOffset,
        left: box.left + pageXOffset
    };

}