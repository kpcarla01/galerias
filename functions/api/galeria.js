function doGet(e) {
  var params = e.parameter;
  var galeriaId = params.galeria || "G001";
  
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. OBTENER NOMBRE DEL FOTÓGRAFO DE LA HOJA "Perfil"
    var fotografo = "";
    var sheetPerfil = ss.getSheetByName("Perfil");
    if (sheetPerfil) {
      var dataPerfil = sheetPerfil.getDataRange().getValues();
      for (var p = 1; p < dataPerfil.length; p++) {
        if (String(dataPerfil[p][0]).trim().toLowerCase() === "fotografo") {
          fotografo = String(dataPerfil[p][1]).trim();
          break;
        }
      }
    }

    // 2. BUSCAR DATOS DE LA GALERÍA EN LA HOJA "Galerias"
    var sheetGalerias = ss.getSheetByName("Galerias") || ss.getSheets()[0];
    var data = sheetGalerias.getDataRange().getValues();
    var row = null;
    
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim().toUpperCase() === String(galeriaId).trim().toUpperCase()) {
        row = data[i];
        break;
      }
    }
    
    if (!row) {
      return responseJSON({ error: "No se encontró la galería con ID: " + galeriaId });
    }
    
    var folderId = row[1];
    var titulo = row[2] || "Galería de Fotos";
    var subtitulo = row[3] || "";
    var password = row[4] ? String(row[4]).trim() : "";
    
    var seleccionadosTexto = row[6] ? String(row[6]) : "";
    var seleccionadosArray = seleccionadosTexto.split(/[\s,]+/)
      .map(function(item) { return item.trim(); })
      .filter(function(item) { return item.length > 0; });

    if (!folderId) {
      return responseJSON({ error: "No hay ID de carpeta configurado para esta galería." });
    }

    // 3. OBTENER PORTADA Y FOTOS DESDE GOOGLE DRIVE
    var parentFolder = DriveApp.getFolderById(String(folderId).trim());
    var portadaUrl = "";

    // BUSCAR LA IMAGEN "PORTADA" DIRECTAMENTE EN LA RAÍZ DE LA CARPETA
    var rootFiles = parentFolder.getFiles();
    while (rootFiles.hasNext()) {
      var rootFile = rootFiles.next();
      if (rootFile.getMimeType().indexOf("image/") !== -1) {
        var rootFileName = rootFile.getName().toLowerCase();
        if (rootFileName.indexOf("portada") !== -1) {
          portadaUrl = "https://lh3.googleusercontent.com/d/" + rootFile.getId() + "=s1200";
          break;
        }
      }
    }

    // OBTENER SUBCARPETAS (CATEGORÍAS)
    var subfolders = parentFolder.getFolders();
    var categoriesMap = [];
    var imagesList = [];
    
    while (subfolders.hasNext()) {
      var subfolder = subfolders.next();
      var folderName = subfolder.getName();
      var displayName = folderName.replace(/^\d+[\s_\-]*/, "").trim();
      
      categoriesMap.push({
        rawName: folderName,
        displayName: displayName || folderName,
        folderObj: subfolder
      });
    }

    categoriesMap.sort(function(a, b) {
      return a.rawName.localeCompare(b.rawName, undefined, { numeric: true, sensitivity: 'base' });
    });

    if (categoriesMap.length > 0) {
      categoriesMap.forEach(function(cat) {
        var files = cat.folderObj.getFiles();
        while (files.hasNext()) {
          var file = files.next();
          if (file.getMimeType().indexOf("image/") !== -1) {
            var fileId = file.getId();
            imagesList.push({
              id: fileId,
              name: file.getName(),
              url: "https://lh3.googleusercontent.com/d/" + fileId + "=s1200",
              categoria: cat.displayName
            });
          }
        }
      });
    } else {
      // Si no hay subcarpetas, escanear todos los archivos en la raíz (excluyendo la portada de la grilla)
      var rootFilesAgain = parentFolder.getFiles();
      while (rootFilesAgain.hasNext()) {
        var file = rootFilesAgain.next();
        if (file.getMimeType().indexOf("image/") !== -1) {
          var fileId = file.getId();
          var fileName = file.getName();
          if (fileName.toLowerCase().indexOf("portada") === -1) {
            imagesList.push({
              id: fileId,
              name: fileName,
              url: "https://lh3.googleusercontent.com/d/" + fileId + "=s1200",
              categoria: "General"
            });
          }
        }
      }
    }

    // Si no encontró un archivo nombrado "portada", usa la primera imagen de la galería
    if (!portadaUrl && imagesList.length > 0) {
      portadaUrl = imagesList[0].url;
    }

    var categoriesList = categoriesMap.map(function(c) { return c.displayName; });

    var result = {
      titulo: titulo,
      fotografo: fotografo,
      subtitulo: subtitulo,
      portadaUrl: portadaUrl,
      hasPassword: password !== "",
      seleccionados: seleccionadosArray,
      images: imagesList,
      hasCategories: categoriesList.length > 0,
      categoriesList: categoriesList
    };

    return responseJSON(result);

  } catch (err) {
    return responseJSON({ error: "Error en servidor: " + err.toString() });
  }
}

function doPost(e) {
  try {
    var postData = JSON.parse(e.postData.contents);
    var galeriaId = postData.galeria;
    var claveIngresada = postData.clave || "";
    var seleccionadosArr = postData.seleccionados || [];
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Galerias") || ss.getSheets()[0];
    var data = sheet.getDataRange().getValues();
    var rowIndex = -1;
    
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim().toUpperCase() === String(galeriaId).trim().toUpperCase()) {
        rowIndex = i + 1;
        var claveCorrecta = data[i][4] ? String(data[i][4]).trim() : "";
        
        if (claveCorrecta !== "" && claveIngresada !== claveCorrecta) {
          return responseJSON({ status: "error", message: "Contraseña incorrecta." });
        }
        break;
      }
    }
    
    if (rowIndex !== -1) {
      var stringSeleccionados = seleccionadosArr.join(" ");
      sheet.getRange(rowIndex, 7).setValue(stringSeleccionados);
      return responseJSON({ status: "success", count: seleccionadosArr.length });
    } else {
      return responseJSON({ status: "error", message: "Galería no encontrada." });
    }
  } catch (err) {
    return responseJSON({ status: "error", message: err.toString() });
  }
}

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
