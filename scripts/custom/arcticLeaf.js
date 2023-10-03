var hash = '';
var appDomain = 'https://klaviyo-cart-rebuilder.arcticleaf.io';
var _learnq = window._learnq;
var categoryStore = 'product-categories';
var categoriesStr = "{  \"_dummy\": []}";
var categories = JSON.parse(categoriesStr);

Object.keys(categories).forEach(function (categoryKey) {
    categories[categoryKey] = categories[categoryKey].join(",");
});

var storedCategories = localStorage.getItem(categoryStore);
var currentStoredCategories = storedCategories ? JSON.parse(localStorage.getItem(categoryStore)) : {};

if (currentStoredCategories && currentStoredCategories !== ' ') {
    for (var id in categories) {
        currentStoredCategories[id] = categories[id];
    }
    localStorage.setItem(categoryStore, JSON.stringify(currentStoredCategories));
} else {
    localStorage.setItem(categoryStore, JSON.stringify(categories));
}

function xhrGET(url, callback) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function asyncRequest() {
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
            try {
                var json = JSON.parse(xmlHttp.responseText);
                callback(json);
            } catch (err) {
                callback();
                console.error('err is: ', err);
            }
        }
    }
    xmlHttp.open("GET", url, true);
    xmlHttp.send(null);
}

function fetchCart(cb) {
    xhrGET('/api/storefront/cart?include=lineItems.digitalItems.options,lineItems.physicalItems.options', function (response) {
        cb(response && response.length ? response[0] : null);
    });
}

function updateKlaviyo(id, items, isEmpty) {
    var currentItems = reformatItems(items);
    var itemNames = currentItems.map(function (item) {
        return item.name;
    });
    var brands = currentItems.map(function (item) {
        return item.brand;
    }).filter(function (brand, index, self) {
        return brand !== '' && self.indexOf(brand) === index;
    });
    var cartCategories = currentItems.map(function (item) {
        return currentStoredCategories[item.productId];
    }).join(',');;
    var itemCount = currentItems.map(function (elem) {
        return elem.quantity;
    }).reduce(function (acc, curr) {
        return acc + curr;
    }, 0);
    var totalValue = currentItems.reduce(function (a, current) {
        return a + current.salePrice * current.quantity;
    }, 0).toFixed(2);
    totalValue = Number(totalValue);
    var thisUrl = encodeURIComponent(window.location.origin);
    var url = appDomain + '/rebuild_cart?id=' + encodeURIComponent(id) + '&hash=' + encodeURIComponent(hash) + '&domain=' + encodeURIComponent(thisUrl);
    _learnq.push(['track', 'Updated Cart (Cart Rebuilder App)', { categories: cartCategories.split(','), cart_url: url, isEmpty: isEmpty, itemNames: itemNames, brands: brands, items: currentItems, totalValue: totalValue, itemCount: itemCount }]);
}

function reformatItems(cart) {
    var formattedCart = [];
    for (var key in cart) {
        cart[key].forEach(function (item) {
            formattedCart.push(item);
        });
    }
    return formattedCart;
}

function getAndUpdate() {
    fetchCart(function (data) {
        if (!data) {
            return updateKlaviyo(null, null, true);
        }
        if (sessionStorage.getItem('cart-updated-status') === data.id + data.updatedTime && !isForce) {
            return;
        }

        localStorage.setItem('prevCartId', data.id);
        sessionStorage.setItem('cart-updated-status', data.id + data.updatedTime);
        updateKlaviyo(data.id, data.lineItems, false);
    });
}

// This function is called from 'packages\core\src\app\customer\Customer.tsx'
//  when a customer enters their email at first checkout step
export function fireArctic(billingEmail, storeHash) {

    hash = storeHash;

    if (window._learnq && window._learnq.identify) {
        var userData = window._learnq.identify();
        userData.$email = billingEmail;
        window._learnq.push(['identify', userData]);
    }

    setTimeout(function () {
        getAndUpdate();
    }, 500);
}
