export default {
    exportJSON: function(jsonString,filename) {
        // Create a Blob with the JSON string and set its MIME type
        const blob = new Blob([jsonString], { type: "application/json" });

        // Create a temporary link element
        const link = document.createElement("a");

        // Create a URL for the Blob and set it as the href
        link.href = URL.createObjectURL(blob);

        // Set the filename for download
        link.download = filename;

        // Append the link to the body (not always required, but good practice)
        document.body.appendChild(link);

        // Simulate a click to download
        link.click();

        // Clean up by removing the link and revoking the object URL
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    },
    importJSON: function(complete_handler){
        let selector=document.createElement("input");
        selector.type="file";
        selector.accept=".json"; // Only accept JSON files
        selector.style.display="none"; // Hide the file input element
        //trigger it
        document.body.appendChild(selector);
        selector.dispatchEvent(new MouseEvent("click"));
        selector.addEventListener("change", function(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.addEventListener("load", function(e) {
                    complete_handler(e.target.result);
                });
                reader.readAsText(file);
            }
        });
    }
}