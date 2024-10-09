/* eslint-disable object-shorthand */
/* eslint-disable radix */
/* eslint-disable no-unsafe-optional-chaining */
import { Actor } from 'apify';
import { PlaywrightCrawler, Dataset } from 'crawlee';

// Initialize the Apify SDK
await Actor.init();

const {
    startUrls = ['https://1688.com'],
} = await Actor.getInput() ?? {};

const crawler = new PlaywrightCrawler({
    headless: false,
    requestHandler: async ({ page, request }) => {
        await page.waitForLoadState('domcontentloaded');
        console.log(request.loadedUrl, 'running on this url');

        const warningPage = await page.$eval('.warnning-text', (div) => div.textContent);

        console.log(warningPage, 'this is warning page');

        if (warningPage) {
            page.reload();
        }
        // if div warnin text exist, wait for 1 second then refresh
        // <div class="warnning-text" data-spm-anchor-id="0.0.0.i0.57095b6eKoL2et">
        // Sorry, we have detected unusual traffic from your network.
        // </div>

        // Get the page title
        const pageTitle = await page.title();
        console.log('Page Title:', pageTitle);

        // title
        await page.waitForSelector('.title-text'); // Extract the title text dynamically
        const titleText = await page.$eval('.title-text', (div) => div.innerText);// Get the text content and trim any whitespace;

        // Log the extracted title text
        console.log('Title Text:', titleText);

        // price multi
        const variantPrice = await page.$('.step-price-wrapper');

        let minimumOfQuantity;
        let range;
        let beginPrice;
        let priceType;

        if (variantPrice) {
            const prices = await page.$$eval('.step-price-item', ($price) => {
                const priceRange = [];
                $price.forEach((x) => {
                    if (x?.querySelector('span.unit-text').innerText?.includes('-')) {
                        beginPrice = x?.querySelector('span.unit-text').innerText.split('-')[0];
                    } else {
                        beginPrice = x?.querySelector('span.unit-text').innerText.replace(/[^0-9]/g, '');
                    }
                    priceRange.push({
                        price: parseInt(x?.querySelector('span.price-text').innerText * 2217.28, 10),
                        begin: parseInt(beginPrice, 2),
                    });
                });

                return priceRange;
            });
            range = prices;
            minimumOfQuantity = prices[0].begin;
            priceType = 'variant_price';
        }

        const rangePrice = await page.$('.price-column');
        if (rangePrice) {
            const priceDetails = await page.$$eval('.price-box', (elements) => {
                return elements.map((el) => {
                    const priceText = el.querySelector('.price-text');
                    if (!priceText) return null; // If no price-text is found, skip

                    // Extract the integer and decimal parts of the price
                    const integerPart = priceText?.querySelector('strong:first-child')?.textContent;
                    const decimalPart = priceText?.querySelector('strong[style]')?.textContent;
                    const fullPrice = parseFloat(`${integerPart}${decimalPart}`); // Combine the price parts

                    // Extract the text from span.unit-text
                    const unitText = el.closest('.price-column').querySelector('span.unit-text')?.textContent || '';

                    const pricing = {
                        price: fullPrice,
                        unit: unitText,
                    };

                    return pricing;
                }).filter(Boolean); // Filter out null values (if any price-box lacks .price-text)
            });

            const filterArr = priceDetails?.filter((x) => x.unit !== '登录后查看券后价立即登录>');

            console.log(filterArr);
            range = [{ price_start: filterArr[0]?.price, price_end: filterArr[1]?.price, begin: filterArr[0]?.unit }];
            minimumOfQuantity = filterArr[0]?.unit;
            priceType = 'range_price';
        }

        console.log(range, 'ini range harga');
        console.log(minimumOfQuantity, 'ini moq');
        console.log(priceType, 'ini element');

        // console.log(prices, 'this is price range')

        // Extract the image URL and text contect color
        const itemWrap = await page.$('.prop-item-wrapper');
        let wrapperColor;
        if (itemWrap) {
            const itemColorWrapper = await page.$('.prop-item-wrapper');
            if (itemColorWrapper) {
                const productInfo = await page.$$eval('.prop-item', (el) => {
                    const productColor = [];
                    el.forEach((x) => {
                        productColor.push({
                            color: x.querySelector('.prop-name').innerText,
                            image: x?.querySelector('.prop-img').style.background.match(/url\("(.*?)"\)/)[1],
                        });
                    });
                    return productColor;
                });
                console.log(productInfo, 'this is productInfo');
                wrapperColor = productInfo;
            }
        }

        // berat produk
        await page.waitForSelector('.od-pc-offer-table');
        const tableProductData = await page.$('.od-pc-offer-table');
        let weight;
        if (tableProductData) {
            await page.$$eval('.od-pc-offer-table tbody tr td', (el) => {
                el.forEach((x) => { weight = x.innerText; });
                return weight;
            });
        }

        // // await page.waitForSelector('.od-pc-offer-table');
        // // const tableSelector = await page.$('.od-pc-offer-table table');
        // // let productDimension;
        // // if (tableSelector) {
        // //     const productData = await page.$$eval('.od-pc-offer-table', (table) => {
        // //         const headers = Array.from(table.querySelectorAll('thead th')).map((header) => header.innerText.trim().toLowerCase().replace(/\s/g, '_'),
        // //         );

        // //         console.log(headers, 'this is headers');

        // //         const products = [];
        // //         const rows = table.querySelectorAll('tbody tr');

        // //         rows.forEach((row) => {
        // //             const columns = row.querySelectorAll('td');
        // //             const productObj = {};

        // //             columns.forEach((column, index) => {
        // //                 const header = headers[index]; // Match column with corresponding header
        // //                 if (header.includes('重量(g)')) {
        // //                     productObj.weight = column.innerText.trim(); // Use header as key
        // //                 } else if (header.includes('体积(cm³)')) {
        // //                     productObj.volume = column.innerText.trim(); // Use header as key
        // //                 } else if (header.includes('高(cm)')) {
        // //                     productObj.height = column.innerText.trim(); // Use header as key
        // //                 } else if (header.includes('宽(cm)')) {
        // //                     productObj.width = column.innerText.trim(); // Use header as key
        // //                 } else if (header.includes('长(cm)')) {
        // //                     productObj.length = column.innerText.trim(); // Use header as key
        // //                 } else if (header.includes('产品规格')) {
        // //                     productObj.title = column.innerText.trim(); // Use header as key
        // //                 }
        // //             });

        // //             products.push(productObj); // Add the product to the list
        // //         });

        // //         console.log(products, 'this is products');

        // //         return products;
        // //     });

        // //     productDimension = productData;
        // //     console.log(productData, 'this is the extracted product data');
        // // }

        // //   console.log(offerInfo)

        // //variant
        await page.waitForSelector('.count-widget-wrapper');
        const itemVariant = await page.$$eval('.sku-item-wrapper', (wrappers) => {
            const variants = [];
            wrappers.forEach((x) => {
                variants.push({
                    title: x?.querySelector('.sku-item-name').innerText,
                    price: parseFloat(x.querySelector('.discountPrice-price').textContent.replace(/[^\d.,]/g, '').replace(',', '.') * 2217.28),
                    stock: parseInt(x.querySelector('.sku-item-sale-num').textContent.replace(/[^\d]/g, ''), 10),
                });
            });
            return variants;
        });

        // console.log(itemVariant, 'this is item variants')

        // product description
        await page.waitForSelector('.detail-description-content');
        const detailContent = await page.$eval('.detail-description-content', (el) => el.innerHTML);
        console.log(detailContent); // This will print the HTML content inside the selected div

        // product image
        await page.waitForSelector('.detail-gallery-turn-wrapper');
        const imageSrcs = await page.$$eval('.detail-gallery-turn-wrapper img', (imgs) => imgs.map((img) => img.src));
        console.log(imageSrcs, 'this is image src');

        // // link product
        // await page.waitForSelector(".offer");
        // const link = await page.$$eval(".offer", (els) => {
        //   return els.map((el) => {
        // const url = el.getAttribute("href");
        // return url;
        //   });
        // });

        // Wait for the title sale column to be visible
        await page.waitForSelector('.title-sale-column');
        // Extract the sold number dynamically
        const soldNumber = await page.$eval('.title-info-number', (span) => {
        // Extract the text content, remove the '+', and replace '.' with '' for conversion
            const numberText = span.innerText.replace('+', '').replace(/\./g, '');

            // Convert the resulting string to an integer
            return parseInt(numberText, 10);
        });

        // console.log(soldNumber);

        // Log the extracted number
        console.log('Sold Number:', soldNumber);

        // const urlName = page.url().split("=");

        const res = {
            //   store: store[store.length - 2],
            title: titleText,
            description: detailContent,
            link: page.url(),
            price_range: range,
            moq: minimumOfQuantity,
            priceType: priceType,
            images: imageSrcs,
            weight: weight ? parseInt(weight, 2) : 0,
            dimension: [],
            variant: itemVariant || wrapperColor,
            sold: soldNumber,
            suplier: {
                title: null,
            },
            // category: urlName[urlName.length - 1],
            date: Date.now(),
        };

        console.log('this is the result', res);
        await Dataset.pushData(res);
    },
});

// await crawler.run(['https://detail.1688.com/offer/597090034012.html']);
await crawler.run(startUrls);

// Exit successfully
await Actor.exit();
