# Run: Rscript analytics/analyze_events.R /path/to/fieldnotes-events.csv
# Uses base R. No packages, external uploads, or API keys required.
args <- commandArgs(trailingOnly = TRUE)
if (length(args) != 1) stop("Provide the path to your exported events CSV.")
events <- read.csv(args[1], stringsAsFactors = FALSE)
required <- c("id", "event_name", "created_at", "data_mode")
if (!all(required %in% names(events))) stop("Expected a Fieldnotes events export.")
if (!nrow(events)) stop("No events yet. Use the app and export again.")
if (anyDuplicated(events$id)) stop("Duplicate event IDs: investigate before analysis.")
events$timestamp <- as.POSIXct(events$created_at, format="%Y-%m-%dT%H:%M:%OS", tz="UTC")
if (anyNA(events$timestamp)) stop("Some timestamps could not be parsed.")
cat("Data modes:", paste(unique(events$data_mode), collapse=", "), "\n")
cat("These are recorded actions from one workspace, not a user sample.\n")
counts <- sort(table(events$event_name), decreasing=TRUE)
print(counts)
output <- file.path(dirname(args[1]), "fieldnotes_feature_usage.png")
png(output, width=1400, height=900, res=150)
par(mar=c(10,5,4,2))
barplot(counts, las=2, col="#9bae8d", border=NA,
        main="Fieldnotes feature usage", ylab="Recorded events")
dev.off()
cat("Saved chart:", output, "\n")
# Next exercise: aggregate activity by UTC day and write a one-page memo.
