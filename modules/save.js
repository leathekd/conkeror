require("content-buffer.js");
require("load-spec.js");
require("suggest-file-name.js");

/* buffer is used only to associate with the download */
define_keywords("$use_cache", "$buffer", "$prepare_download");
function save_uri(load_spec, output_file) {
    keywords(arguments, $use_cache = false);

    var use_cache = arguments.$use_cache;

    var buffer = arguments.$buffer;

    var prepare_download = arguments.$prepare_download;

    var cache_key = null;
    var post_data = null;
    var uri = null;
    var referrer_uri = null;
    if (typeof(load_spec) == "string") {
        uri = make_uri(load_spec);
    } else {
        uri = make_uri(load_spec.url);
        referrer_uri = load_spec.referrer;
        post_data = load_spec.post_data;
        if (use_cache)
            cache_key = load_spec.cache_key;
    }

    var file_uri = makeFileURL(output_file);

    var persist = Cc["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"].createInstance(Ci.nsIWebBrowserPersist);

    persist.persistFlags =
        Ci.nsIWebBrowserPersist.PERSIST_FLAGS_REPLACE_EXISTING_FILES |
        Ci.nsIWebBrowserPersist.PERSIST_FLAGS_AUTODETECT_APPLY_CONVERSION |
        Ci.nsIWebBrowserPersist.PERSIST_FLAGS_CLEANUP_ON_FAILURE;

    if (use_cache)
        persist.persistFlags |= Ci.nsIWebBrowserPersist.PERSIST_FLAGS_FROM_CACHE;
    else
        persist.persistFlags |= Ci.nsIWebBrowserPersist.PERSIST_FLAGS_BYPASS_CACHE;

    var info = register_download(buffer, uri);
    if (prepare_download)
        prepare_download(info);

    var tr = Cc["@mozilla.org/transfer;1"].createInstance(Ci.nsITransfer);
    tr.init(uri, file_uri, output_file.leafName,
            mime_info_from_load_spec(load_spec),
            null /* start time */,
            null /* temp file */,
            persist);
    persist.progressListener = tr;
    persist.saveURI(uri, cache_key, referrer_uri, post_data, null /* no extra headers */, file_uri);

    return info;
}


// We have no DOM, and can only save the URL as is.
const SAVEMODE_FILEONLY      = 0x00;
// We have a DOM and can save as complete.
const SAVEMODE_COMPLETE_DOM  = 0x01;
// We have a DOM which we can serialize as text.
const SAVEMODE_COMPLETE_TEXT = 0x02;

function get_save_mode_from_content_type(content_type) {
    var mode = SAVEMODE_FILEONLY;
    switch (content_type) {
    case "text/html":
    case "application/xhtml+xml":
        mode |= SAVEMODE_COMPLETE_TEXT;
        // Fall through
    case "text/xml":
    case "application/xml":
        mode |= SAVEMODE_COMPLETE_DOM;
        break;
    }
    return mode;
}

define_keywords("$use_cache", "$buffer", "$wrap_column", "$prepare_download");
function save_document_as_text(document, output_file)
{
    keywords(arguments, $use_cache = true, $wrap_column = 80);

    var mode = get_save_mode_from_content_type(document.contentType);
    if (!(mode & SAVEMODE_COMPLETE_TEXT))
        throw interactive_error("Document cannot be saved as text.");

    var use_cache = arguments.$use_cache;

    var prepare_download = arguments.$prepare_download;

    var buffer = arguments.$buffer;

    var uri = document.documentURIObject;

    var file_uri = makeFileURL(output_file);

    var persist = Cc["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"].createInstance(Ci.nsIWebBrowserPersist);

    persist.persistFlags =
        Ci.nsIWebBrowserPersist.PERSIST_FLAGS_REPLACE_EXISTING_FILES |
        Ci.nsIWebBrowserPersist.PERSIST_FLAGS_AUTODETECT_APPLY_CONVERSION |
        Ci.nsIWebBrowserPersist.PERSIST_FLAGS_CLEANUP_ON_FAILURE;

    var encoding_flags =
        Ci.nsIWebBrowserPersist.ENCODE_FLAGS_FORMATTED |
        Ci.nsIWebBrowserPersist.ENCODE_FLAGS_ABSOLUTE_LINKS |
        Ci.nsIWebBrowserPersist.ENCODE_FLAGS_NOFRAMES_CONTENT;


    if (use_cache)
        persist.persistFlags |= Ci.nsIWebBrowserPersist.PERSIST_FLAGS_FROM_CACHE;
    else
        persist.persistFlags |= Ci.nsIWebBrowserPersist.PERSIST_FLAGS_BYPASS_CACHE;



    var info = register_download(buffer, uri);
    if (prepare_download)
        prepare_download(info);

    var tr = Cc["@mozilla.org/transfer;1"].createInstance(Ci.nsITransfer);
    tr.init(uri, file_uri, output_file.leafName,
            mime_info_from_mime_type("text/plain"),
            null /* start time */,
            null /* temp file */,
            persist);
    persist.progressListener = tr;
    persist.saveDocument(document, file_uri, null /* data path */,
                         "text/plain", encoding_flags,
                         arguments.$wrap_column);
    return info;
}

define_keywords("$use_cache", "$buffer", "$prepare_download");
function save_document_complete(document, output_file, output_dir) {

    var mime_type = document.contentType;

    var mode = get_save_mode_from_content_type(mime_type);
    if (!(mode & SAVEMODE_COMPLETE_DOM))
        throw interactive_error("Complete document cannot be saved.");

    var use_cache = arguments.$use_cache;

    var buffer = arguments.$buffer;

    var prepare_download = arguments.$prepare_download;

    var uri = document.documentURIObject;

    var file_uri = makeFileURL(output_file);

    var persist = Cc["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"].createInstance(Ci.nsIWebBrowserPersist);

    persist.persistFlags =
        Ci.nsIWebBrowserPersist.PERSIST_FLAGS_REPLACE_EXISTING_FILES |
        Ci.nsIWebBrowserPersist.PERSIST_FLAGS_AUTODETECT_APPLY_CONVERSION |
        Ci.nsIWebBrowserPersist.PERSIST_FLAGS_CLEANUP_ON_FAILURE;

    var encoding_flags =
        Ci.nsIWebBrowserPersist.ENCODE_FLAGS_BASIC_ENTITIES;

    if (use_cache)
        persist.persistFlags |= Ci.nsIWebBrowserPersist.PERSIST_FLAGS_FROM_CACHE;
    else
        persist.persistFlags |= Ci.nsIWebBrowserPersist.PERSIST_FLAGS_BYPASS_CACHE;


    var info = register_download(buffer, uri);
    if (prepare_download)
        prepare_download(info);

    var tr = Cc["@mozilla.org/transfer;1"].createInstance(Ci.nsITransfer);
    tr.init(uri, file_uri, output_file.leafName,
            mime_info_from_mime_type(mime_type),
            null /* start time */,
            null /* temp file */,
            persist);
    persist.progressListener = tr;
    persist.saveDocument(document, file_uri, output_dir /* data path */,
                         mime_type, encoding_flags,
                         0);
    return info;
}

function download_failed_error() {
    var e = new Error("Download failed");
    e.__proto__ = download_failed_error.prototype;
    return e;
}
download_failed_error.prototype.__proto__ = Error.prototype;

/* Returns an array of two elements: the first element is the 
 * nsILocalFile object, the second element is a boolean indicating
 * whether the file is temporary and should be deleted when the caller is
 * done with it.
 */
define_keywords("$action", "$shell_command", "$shell_command_cwd", "$buffer", "$use_cache");
function download_as_temporary(load_spec) {
    keywords(arguments, $use_cache = true);

    var action_description = arguments.$action;
    var shell_command = arguments.$shell_command;
    var shell_command_cwd = arguments.$shell_command_cwd;

    var uri = uri_from_load_spec(load_spec);
    // If it is local file, there is no need to download it
    if (uri.scheme == "file")
    {
        let file = uri.QueryInterface(Ci.nsIFileURL).file;

        yield co_return([file, false /* not temporary */]);
    }


    var file = get_temporary_file(suggest_file_name(load_spec));

    var cc = yield CONTINUATION;

    function handle_state_change(info) {
        var state = info.state;
        switch (state) {
        case DOWNLOAD_CANCELED:
        case DOWNLOAD_FAILED:
            info.remove(); // ensure that the download cannot be retried later
            try {
                // Delete the temporary file
                file.remove(false /*non-recursive*/);
            } catch (e) {}
            cc.throw(download_failed_error());
            break;
        case DOWNLOAD_FINISHED:
            cc([file, true /* temporary */]);
            break;
        }
    }

    save_uri(load_spec, file,
             $use_cache = arguments.$use_cache,
             $buffer = arguments.$buffer,
             $prepare_download = function (info) {
                 if (action_description != null) {
                     info.action_description = action_description;
                     info.temporary_status = DOWNLOAD_TEMPORARY_FOR_ACTION;
                 } else if (shell_command != null) {
                     info.set_shell_command(shell_command, shell_command_cwd);
                     info.temporary_status = DOWNLOAD_TEMPORARY_FOR_COMMAND;
                 }
                 add_hook.call(info, "download_state_change_hook", handle_state_change);
             });

    var result = yield SUSPEND;
    yield co_return(result);
}
