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

            friends = friends.filter(function (el) {

                if (el.id != e.target.id) {
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
});

addedList.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopImmediatePropagation();

    if (e.target.id) {
            addedFriendsArr = addedFriendsArr.filter(function (el) {

                if (el.id != e.target.id) {
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