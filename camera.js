/**
 * Created by Matthew on 6/22/2017.
 */
var CameraHelper = function ($q, $cordovaCamera, $cordovaFile, $cordovaFileTransfer, $cordovaDevice, $cordovaActionSheet, Constants) {
    var selectPictureType = function (type, q) {
        var options = {
            quality: 90,
            sourceType: type,
            mediaType: Camera.MediaType.PICTURE,
            destinationType: Camera.DestinationType.FILE_URI,
            correctOrientation: true,
            saveToPhotoAlbum: false
        };
        $cordovaCamera.getPicture(options).then(function (imagePath) {
                var currentName = imagePath.replace(/^.*[\\\/]/, '');
                // Create a new name for the photo
                var d = new Date(),
                    n = d.getTime(),
                    newFileName = "QST" + n + ".jpg";

                // If you are trying to load image from the gallery on Android we need special treatment!
                if ($cordovaDevice.getPlatform() === 'Android' && options.sourceType === Camera.PictureSourceType.PHOTOLIBRARY) {
                    window.FilePath.resolveNativePath(imagePath, function (entry) {
                        window.resolveLocalFileSystemURL(entry, success, fail);

                        function fail(e) {
                            console.error('Error: ', e);
                            q.reject(e);
                            return q.promise;
                        }

                        function success(fileEntry) {
                            var namePath = fileEntry.nativeURL.substr(0, fileEntry.nativeURL.lastIndexOf('/') + 1);
                            // Only copy because of access rights
                            $cordovaFile.copyFile(namePath, fileEntry.name, cordova.file.dataDirectory, newFileName).then(function (response) {
                                q.resolve(response.nativeURL);
                            }, function (error) {
                                console.log('Error', error);
                                q.reject(error);
                            });
                        }
                    });
                } else {
                    var namePath = imagePath.substr(0, imagePath.lastIndexOf('/') + 1);
                    // Move the file to permanent storage
                    $cordovaFile.moveFile(namePath, currentName, cordova.file.dataDirectory, newFileName).then(function (response) {
                        console.log("On Success", response.nativeURL);
                        q.resolve(response.nativeURL);
                    }, function (error) {
                        q.reject(error);
                        console.log('Error', error);
                    });
                }
            },
            function (err) {
                // Not always an error, maybe cancel was pressed...
            });
    };

    var getPicture = function () {
        var q = $q.defer();
        var options = {
            title: 'Select Image Source',
            buttonLabels: ['Gallery', 'Camera'],
            addCancelButtonWithLabel: "Cancel",
            androidEnableCancelButton: true
        };
        $cordovaActionSheet.show(options).then(function (btnIndex) {
            var type = null;
            switch (btnIndex) {
                case 1:
                    type = Camera.PictureSourceType.PHOTOLIBRARY;
                    break;
                case 2:
                    type = Camera.PictureSourceType.CAMERA;
                    break;
            }
            if (type !== null) {
                selectPictureType(type, q);
            }
        });
        return q.promise;
    };
    //options to use for picture loading
    var uploadToServer = function (filePaths) {
        var q = $q.defer();
        var url = Constants.baseUrl + 'api/upload';
        var options = {
            fileKey: 'file',
            chunkedMode: false,
            mimeType: "multipart/form-data"
        };
        if (angular.isArray(filePaths)) {
            console.log("isArray");
            var name = [];
            angular.forEach(filePaths, function (path) {
                $cordovaFileTransfer.upload(url, path, options).then(function (response) {
                    name.push(response.response[0]);
                    console.log(response.response);
                }, function (error) {
                    q.reject(error);
                })
            });
            q.resolve(name);
        } else {
            $cordovaFileTransfer.upload(url, filePaths, options).then(function (response) {
                q.resolve(JSON.parse(response.response));
            }, function (error) {
                q.reject(error);
            })
        }
        return q.promise;
    };
    var methods = {
        getPicture: getPicture,
        uploadToServer: uploadToServer
    };
    return methods;

};
CameraHelper.$inject = [
    '$q',
    '$cordovaCamera',
    '$cordovaFile',
    '$cordovaFileTransfer',
    '$cordovaDevice',
    '$cordovaActionSheet',
    'Constants'
];
app.factory('CameraHelper', CameraHelper);