/*
 * Place the widget on an input field for images (no other files will work with this widget)
 * @param {maxDimensions} the maximum width/height of the rendered image
 * @param {maxImageSize} the desired maximum file size (kb) of the rendered image 
 * @param {maxUploadFileSize} the maximum file size (kb) for the greyleaf portal (default is set to 10MB)
 * @param {minQuality} the lowest acceptable image quality (between 0 and 1)
 * @param {quality} the desired image quality that images should be rendered at
 */

$.widget("greyleaf.glImageRender", {

    options: {
        maxDimension: 1920,
        maxImageSize: 150,
        maxUploadFileSize: 10485760,
        minQuality: 0.7,
        quality: 0.7,
        storageFileLocation: '',
        url: '/Storage/TempUploadStorageFile/Upload',
        errorMessage: 'ERROR: File could not be uploaded'
    },

    _create: function () {

        console.log("version 1.2.1");

        var _widget = this;
        var $container = _widget.element;

        var _maxDimension = _widget.options.maxDimension;
        var _maxImageSize = _widget.options.maxImageSize;
        var _maxUploadFileSize = _widget.options.maxUploadFileSize;
        var _minQuality = _widget.options.minQuality;
        var _quality = _widget.options.quality;
        var _storageFileLocation = _widget.options.storageFileLocation;
        var _url = _widget.options.url;

        /*
         * Wrap the input field in the file - this will allow for diplaying the image after the input field (a preview)
         */
        $container.hide();
        $container.attr("readonly", "readonly").hide();
        $container.wrap($(document.createElement("div")).addClass('greyleaf-image-render-container'));
        var $wrapper = $container.parent('.greyleaf-image-render-container');

        /*
         * Create and display an input element
         */
        var $imageInput = $(document.createElement("input")).addClass('greyleaf-image-input').attr('type', 'file').appendTo($wrapper);

        /*
         * Wait for a file to be selected, then run the script
         */
        $imageInput.change(function (file) {

            if (typeof (this.files) !== "undefined" && this.files !== null) {
                var _file = this.files[0];

                /*
                 * Check if the following elements have been created already, if so - remove them
                 * This should occur here as the new file might not be an image so the image preview should be removed
                 */
                var _oldOriginalImage = $wrapper.find("#greyleaf-rendered-image");
                var _oldCompressedImage = $wrapper.find(".greyleaf-rendered-image");

                if (_oldOriginalImage !== null || _oldCompressedImage !== null) {
                    _oldOriginalImage.remove();
                    _oldCompressedImage.remove();
                    $wrapper.find(".background-preloader.greyleaf-image-render").remove();
                }

                /*
                 * This should only run if the file input is an image
                 */
                if (_file.name.match(/\.(jpg|JPG|jpeg|png|bmp|gif)$/)) {
                    /*
                     * Create the image as a hidden DOM element (delete after use?)
                     */
                    var _image = $(document.createElement('img'))
                                    .attr('id', 'greyleaf-rendered-image')
                                    .attr('src', window.URL.createObjectURL(_file))
                                    .hide()
                                    .appendTo($wrapper);

                    /*
                     * Convert the file size to kilobytes and compare with the maxImageSize specified
                     */
                    if ((_file.size / 1024) > _maxImageSize) {

                        _image.on('load', function () {

                            /*
                             * Create a canvas to perform the image rendering
                             * Ensure that no canvas already exists for this purpose
                             */
                            var $renderCanvas = $('#greyleaf-image-render-canvas');

                            if ($renderCanvas.length === 0) {
                                $renderCanvas = $(document.createElement('canvas'))
                                                    .attr('id', 'greyleaf-image-render-canvas');
                            }

                            /*
                             * Initialise the canvas
                             */
                            var _canvas = $renderCanvas[0];
                            var _context = _canvas.getContext('2d');
                            _context.drawImage(_image[0], 0, 0);

                            /*
                             * Calculate new dimensions for the image based on maxDimension
                             */
                            var _newWidth = _image.width();
                            var _newHeight = _image.height();

                            if (_newWidth > _newHeight) {
                                //Landscape image
                                if (_newWidth > _maxDimension) {
                                    _newHeight *= (_maxDimension / _newWidth);
                                    _newWidth = _maxDimension;

                                }
                            } else {
                                //Potrait image
                                if (_newHeight > _maxDimension) {
                                    _newWidth *= (_maxDimension / _newHeight);
                                    _newHeight = _maxDimension;
                                }
                            }

                            /*
                             * Set the canvas dimensions based on the new calculated width and height
                             */
                            _canvas.width = _newWidth;
                            _canvas.height = _newHeight;

                            /*
                             * Render the image on the canvas and compress it
                             */
                            _context.drawImage(_image[0], 0, 0, _newWidth, _newHeight);
                            var _src = _canvas.toDataURL('image/jpeg', _quality);
                            /*
                             * Create an image, perform the image render, then display the image
                             */
                            var _newImage = new Image();
                            _newImage.src = _src;

                            /*
                             * Upload the compressed image to the server
                             */
                            var blob = _widget._dataURItoBlob(_src);
                            console.log(blob.size/1024);
                            if (blob.size <= _maxUploadFileSize) {
                                $(_newImage).addClass('greyleaf-rendered-image').appendTo($wrapper);
                                // _widget._uploadImage(blob)
                            }

                            // $wrapper.find('.greyleaf-rendered-image').show();
                        });
                    } else {
                        /*
                         * The image is small enough, just upload & display it..
                         */
                        _image.addClass('greyleaf-rendered-image');
                        // _widget._uploadImage(_file);
                    }

                }
            }
        });
    },

    /*
     * AJAX call to upload the image
     */
    _uploadImage: function (file) {
        var _widget = this;
        var $container = _widget.element;

        var $wrapper = $container.parent('.greyleaf-image-render-container');

        var $preloader = $('.background-preloader.greyleaf-image-render');
        if ($preloader.length === 0) {
            $preloader = $(document.createElement('div')).addClass('background-preloader greyleaf-image-render').hide().appendTo($wrapper);
        }

        var formData = new FormData();
        formData.append("file", file);
        formData.append("storageFileLocation", _widget.options.storageFileLocation);

        if (formData !== null && file !== null) {
            $.ajax({
                url: _widget.options.url,
                type: 'POST',
                xhr: function () {
                    var greyleafXhr = $.ajaxSettings.xhr();
                    if (greyleafXhr.upload) {
                        greyleafXhr.upload.onprogress = function (e) {
                            if (e.lengthComputable) {
                                $('.background-preloader.greyleaf-image-render').show();
                            }
                        };
                    }
                    return greyleafXhr;
                },
                data: formData,
                dataType: 'json',
                success: function (data) {
                    if (data.result === "OK") {
                        $container.attr('value', data.guid);
                        $preloader.hide();
                        $wrapper.find('.greyleaf-rendered-image').show();
                    } else {
                        $preloader.hide();
                        $(document.createElement('p')).text(_widget.options.errorMessage).appendTo($wrapper);
                    }

                },
                cache: false,
                contentType: false,
                processData: false
            });
        }
    },

    /*
     * Used to convert the newly rendered image into a blob which can then be uploaded
     */
    _dataURItoBlob: function (dataURI) {
        // convert base64/URLEncoded data component to raw binary data held in a string
        var byteString;
        if (dataURI.split(',')[0].indexOf('base64') >= 0) {
            byteString = atob(dataURI.split(',')[1]);
        } else {
            byteString = unescape(dataURI.split(',')[1]);
        }

        // separate out the mime component
        var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

        // write the bytes of the string to a typed array
        var ia = new Uint8Array(byteString.length);
        for (var i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }

        return new Blob([ia], { type: mimeString });
    },

    /*
     * Functions to support IE9
     */

    _successFunction: function (data, hiddenField) {
        var _widget = this;
        var $container = this.element;
        var $wrapper = $container.parent('.greyleaf-image-render-container');

        var $preloader = $('.background-preloader.greyleaf-image-render');

        if (data[2] === 'OK' && data[4].length > 0) {
            $container.val(data[6]);
            $preloader.hide();
        }
        else {
            $(document.createElement('p')).text(_widget.options.errorMessage).appendTo($wrapper);
            $preloader.hide();
        }
    },

    _getIframeContentJSON: function (iframe) {
        var response = { result: 'NOK' };

        try {
            var doc = iframe.contentDocument ? iframe.contentDocument : iframe.contentWindow.document;

            var innerHTML = doc.body.innerHTML;
            //plain text response may be wrapped in <pre> tag
            if (innerHTML.slice(0, 5).toLowerCase() == "<pre>" && innerHTML.slice(-6).toLowerCase() == "</pre>") {
                innerHTML = doc.body.firstChild.firstChild.nodeValue;
            }

            var result = innerHTML.replace(/[\W][^a-vA-Z0-9-.]+/g, " ");
            var reponse = result.split(" ");

            return reponse;
        }
        catch (err) {
            return response = { result: 'NOK' };
        }
    }
});