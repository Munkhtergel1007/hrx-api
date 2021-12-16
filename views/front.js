module.exports = function (initialState, manifest) {
    return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    
        <link rel="stylesheet" href="/landing/css/bootstrap.min.css">
        <link rel="stylesheet" href="/landing/css/navigation.min.css">
        <link rel="stylesheet" href="/landing/css/main.css">
        <link rel="stylesheet" href="/landing/css/theme-font.min.css">
        <link rel="stylesheet" href="/landing/css/bulgaaHome.css">
        <link rel="stylesheet" href="/landing/css/tapsir.css">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap" rel="stylesheet">
        <link rel="shortcut icon" href="https://odosury.com/favicon.png" />
        <script type="module" src="https://unpkg.com/ionicons@5.5.2/dist/ionicons/ionicons.esm.js"></script>
        <script nomodule src="https://unpkg.com/ionicons@5.5.2/dist/ionicons/ionicons.js"></script>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
<!--        <title>TATATUNGA | Байгууллагын нэгдсэн систем</title>-->
        <style>
            .crumina-main-slider .swiper-container, .crumina-main-slider .swiper-wrapper, .crumina-main-slider .swiper-slide {
                height: calc(100vh - 70px);
                border-bottom: 10px solid #1A3452;
            }
            .right-menu .widget {
                padding: 40px 60px 0 60px;
            }
            .right-menu .widget:last-child {
                margin-top: 0px;
            }
            .w-contacts .contact-item {
                margin-bottom: 25px;
            }
            .main-slider-slides .slides-item-title {
                font-weight: 700;
                margin-bottom: 0;
                color: inherit;
                text-transform: uppercase;
                font-size: 16px;
            }
            .main-slider-slides .slides-item .slides-item-icon {
                position: absolute;
                right: 20px;
                top: 50%;
                -webkit-transform: translateY(-50%);
                -ms-transform: translateY(-50%);
                transform: translateY(-50%);
                width: 40px;
            }
            h2.h1.slider-content-title {
                text-transform: uppercase;
            }
            .button--primary {
                background-color: #1A3452;
                border-color: #1A3452;
            }
            .w-contacts .contact-item .title:hover {
                color: #1A3452;
            }
            .right-menu .user-menu-content {
                background-color: #1A3452;
            }
        </style>
        <link rel="manifest" href="/manifest.json" />
        <script></script>
      </head>
      <body class="crumina-grid">
        <div id="wrap"  ></div>
        <script>
            window.__INITIAL_STATE__ = ${JSON.stringify(initialState)}
        </script>  
        <script src=${process.env.NODE_ENV === 'development' ? '/dist/front.js' : manifest["front.js"]}></script>
        <script src="/landing/js/js-plugins/navigation.min.js" defer></script>
        <script src="/landing/js/jquery-3.4.1.min.js"></script>
        <script src="/landing/js/Bootstrap/bootstrap.bundle.min.js"></script>
        <script src="/landing/js/js-plugins/waypoints.js"></script>
        <script src="/landing/js/js-plugins/imagesloaded.pkgd.min.js"></script>
        <script src="/landing/js/js-plugins/select2.min.js"></script>
        <script src="/landing/js/js-plugins/swiper.min.js"></script>
        <script src="/landing/js/js-plugins/anime.min.js"></script>
        <script src="/landing/js/main.js"></script>
      </body>
    </html>
  `
};