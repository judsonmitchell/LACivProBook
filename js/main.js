// Check if a new cache is available on page load.
window.addEventListener('load', function () {

    window.applicationCache.addEventListener('updateready', function () {
        if (window.applicationCache.status === window.applicationCache.UPDATEREADY) {
        // Browser downloaded a new app cache.
        // Swap it in and reload the page to get the new code.
            window.applicationCache.swapCache();
            if (confirm('A new version of LaCrimBook is available. Load it?')) {
                window.location.reload();
            }
        }
        else {
        // Manifest didn't changed. Nothing new to server.
        }
    }, false);

}, false);

//CrimBook with sqlite backend
var myData,
    State,
    History = window.History,
    appName = 'LACivProBook',
    lawSections = [          //Corresponds to West thumb index;
    {'name':'Code of Civil Procedure', 'start': 'CCP' },
    {'name':'Title 1', 'start': 'RS 000001' },
    {'name':'Title 9', 'start': 'RS 000009' },
    {'name':'Title 12', 'start': 'RS 000012' },
    {'name':'Title 13', 'start': 'RS 000013' },
    {'name':'Title 20', 'start': 'RS 000020' },
    {'name':'Title 22', 'start': 'RS 000022' },
    {'name':'Title 23', 'start': 'RS 000023' },
    {'name':'Title 35', 'start': 'RS 000035' },
    {'name':'Title 39', 'start': 'RS 000039' },
    {'name':'Title 40', 'start': 'RS 000040' },
    {'name':'Civil Code', 'start': 'CC' },
    {'name':'Code of Evidence', 'start': 'CE' },
    {'name':'Childrens Code', 'start': 'CHC' }
],
//Change content depending on state
updateContent = function(State,callback) {
    var target = State.data.id,
        view = State.data.type,
        pos = State.data.pos,
        items,
        laws,
        loc = window.location.toString().queryStringToJSON();

    //Ensure that any alert messages are hidden
    $('.alert').hide();

    //Clear the search term
    if (loc.view === 'search'){
        $('input').val(loc.target);
    } else {
        $('input').val('');
    }

    if (loc.view === 'search' || loc.view === 'list' ||  loc.view === 'law' || loc.view ==='favorites') {
        $('#app-name').text('');
        $('.navbar-brand i').show();
    } else {
        $('#app-name').text(appName);
        $('.navbar-brand i').hide();
    }

    switch (view) {
    case 'list':
        items = ' <div class="list-group display-rows">';
        laws = jlinq.from(myData).starts('sortcode', target + ' ').select();
        for (var i = 0, l = laws.length; i < l; i ++) {
            items += '<a class="law-link list-group-item" href="#" data-id="' + laws[i].id + '">' + laws[i].title + ' ' + laws[i].description + '</a>';
        }
        items += '</div>';
        $('.panel').html(items);
        $(document).scrollTop(pos);
        break;
    case 'law':
        laws = jlinq.from(myData).equals('id', target).select();
        //check to see if this law has been favorited
        var fav;
        if (localStorage.getItem(target)){
            fav = '<a href="#" class="favorite upper-right-corner" data-state="saved" data-id="' + target +
            '" title="Favorite This"><i class="fa fa-star"></i></a>';
        }
        else {
            fav = '<a href="#" class="favorite upper-right-corner" data-state="unsaved" data-id="' + target +
            '" title="Favorite This"><i class="fa fa-star-o"></i></a>';
        }
        $('title').text(laws[0].description + ' ' + laws[0].title);
        $('.panel').css({'padding':'10px'}).html('<h3><span class="lawTitle">' + laws[0].description + '</span>' + fav + '</h3>' + laws[0].law_text);
        $(document).scrollTop(0);
        break;
    case 'search':
        var regex = new RegExp('\\b' + target + '\\b');
        console.timeStamp('querying jlinq');
        //Too slow 7s on mobile
        laws = jlinq.from(myData).match('law_text', regex).or().match('title', regex).select();
        //Faster 5s
        //laws = jlinq.from(myData).contains('law_text', target).or().contains('title', target).select();
        //Fastest 2s
        //laws = jlinq.from(myData).contains('law_text', target).select();
        console.timeStamp('starting items object');
        items = '<div class="list-group">';
        if (!laws.length){
            items += '<a class="list-group-item">No results found.</a>';
        } else {
            for (i = 0, l = laws.length; i < l; i ++) {
                var snippet = getExcerpt(laws[i].law_text, target, 15);
                if (snippet){
                    items += '<a class="law-link list-group-item" href="#" data-id="' + laws[i].id +
                    '">' + laws[i].title + ' ' + laws[i].description +
                    '<p class="preview">...' + snippet + '...</p>' + '</a>' ;
                } else {
                    items += '<a class="law-link list-group-item" href="#" data-id="' + laws[i].id +
                    '">' + laws[i].title + ' ' + laws[i].description + '</a>' ;
                }
            }
        }
        items += '</div>';
        console.markTimeline('items object finished');
        $('.panel').html(items);
        $(document).scrollTop(pos);
        break;
    case 'favorites':
        items = ' <div class="list-group display-rows">';
        if (localStorage.length > 0) {
            for (var i = 0; i < localStorage.length; i++) {
                var key = localStorage.key(i);
                laws = jlinq.from(myData).equals('id', key).select();
                items += '<a class="law-link list-group-item" href="#" data-id="' + laws[0].id + '">' + laws[0].description +
                ' ' + laws[0].title + '</a>';
            }
        }
        else {
            items += '<a class="list-group-item">You don\'t have any favorited laws</a>';
        }

        items += '</div>';
        $('.panel').html(items);
        $(document).scrollTop(pos);
        break;
    default:
        var menu = ' <div class="list-group">';
        for (var int = 0, max = lawSections.length; int < max; int ++) {
            var v = lawSections[int];
            menu += '<a class="nav-link list-group-item list-group-item " data-id="' + v.start + '" href="#">' +
            '<i class="fa fa-angle-right pull-right"></i>    ' + v.name + '</a>';
        }
        menu += '</div>';
        $('.panel').html(menu);
        $(document).scrollTop(pos);
    }
    callback();
},

setCurrentPosition = function () {
    var currentView = window.location.toString().queryStringToJSON();
    var scroll = $(document).scrollTop();
    History.replaceState({type: currentView.view, id: currentView.target, pos: scroll}, currentView.target, '?target=' + currentView.target + '&view=' + currentView.view);
},

updateFavoritesList = function () {
    if (localStorage.length > 0) {
        var favList = '',
        key,
        value,
        i;

        if (localStorage.length > 4) {
            for (i = 0; i < 5; i++) {
                key = localStorage.key(i);
                value = localStorage.getItem(key);
                favList += '<li><a class="fav-link" href="#" data-id="' + key + '">' + value + '</a></li>';
            }
            favList += '<li class="divider"></li><li><a class="fav-all" href="#">View All</a></li>';
        }
        else {
            for (i = 0; i < localStorage.length; i++) {
                key = localStorage.key(i);
                value = localStorage.getItem(key);
                favList += '<li><a class="fav-link" href="#" data-id="' + key + '">' + value + '</a></li>';
            }
        }

        $('.dropdown-menu').html(favList);
    }
},

init = function () {
    $.ajax({url: 'data/data.json', dataType:'json', beforeSend: function () { $('.panel').hide(); }})
    .done(function(data){
        $('.loading').hide();
        $('.panel').show();
        myData = data;
        State = History.getState();
        var t = State.url.queryStringToJSON();
        History.pushState({type: t.view, id: t.target}, $('title').text(), State.urlPath);
        updateContent(History.getState(),function () {
            updateFavoritesList();
        });
    })
   .fail(function(jqXHR, textStatus, errorThrown){
        $('.alert').html('Error Retrieving Laws:' + errorThrown).show();
    });

    //Handle History
    History.Adapter.bind(window, 'statechange', function () {
        if (typeof spinnerplugin !== 'undefined'){
            spinnerplugin.show({overlay: false, fullscreen: false});
        }
        updateContent(History.getState(), function () {
            updateFavoritesList();
            if (typeof spinnerplugin !== 'undefined'){
                spinnerplugin.hide();
            }
        });
    });

    //Handle clicks
    $('.main').on('click', 'a.nav-link', function (event) {
        event.preventDefault();
        var target = $(this).attr('data-id');
        var scroll = $(document).scrollTop();
        History.pushState({type: 'list', id: target}, target, '?target=' + target + '&view=list');
    });

    $('.main').on('click', 'a.law-link', function (event) {
        event.preventDefault();
        setCurrentPosition();
        var target = $(this).attr('data-id');
        History.pushState({type: 'law', id: target}, target, '?target=' + target + '&view=law');
    });

    $('form').on('submit', function (event) {
        event.preventDefault();
        var target = $(this).find('.search-query').val();
        $(document).scrollTop('0');
        History.pushState({type: 'search', id: target}, target, '?target=' + target + '&view=search');
    });

    $('.main').on('click', 'a.favorite', function (event) {
        event.preventDefault();
        var target = $(this).attr('data-id');
        var saveState = $(this).attr('data-state');
        if (saveState === 'unsaved') {
            var title = $(this).prev().html();
            localStorage.setItem(target, title);
            $('.alert').html('Saved to favorites.').show();
            $('.favorite').html('<i class="fa fa-star"></i');
            $(this).attr('data-state', 'saved');
            updateFavoritesList();
        }
        else {
            localStorage.removeItem(target);
            $(this).attr('data-state', 'unsaved');
            $('.alert').html('Removed from favorites.').show();
            $('.favorite').html('<i class="fa fa-star-o"></i');
            updateFavoritesList();
        }
    });

    $('.navbar-headnav').on('click', 'a.fav-link', function (event) {
        event.preventDefault();
        setCurrentPosition();
        var target = $(this).attr('data-id');
        History.pushState({type: 'law', id: target}, target, '?target=' + target + '&view=law');
        if ($('.collapse').css('display') === 'block'){
            $('.collapse').collapse('hide');
        }
    });

    $('.navbar-headnav').on('click', 'a.fav-all', function (event) {
        event.preventDefault();
        setCurrentPosition();
        History.pushState({type: 'favorites', id: null}, 'Favorites', '?view=favorites');
        if ($('.collapse').css('display') === 'block'){
            $('.collapse').collapse('hide');
        }
    });

    $('.navbar-headnav').on('click', 'a.go-home', function (event) {
        event.preventDefault();
        var scroll = '0';
        //History.pushState({type: 'home', id: null, pos: scroll}, 'Home', '/');
        History.back();
    });

    $('.main').swipe({
        swipe:function(event, direction, distance, duration, fingerCount) {
            if (direction === 'right'){
                History.back();
            }
            if (direction === 'left'){
                History.go(1);
            }
        },
        allowPageScroll: 'vertical'
    });

    $(function() {
        FastClick.attach(document.body);
    });

};

//document.addEventListener('deviceready', init, false);
$(document).ready(function () {init();});
