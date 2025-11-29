const permissionError = new FirestorePermissionError({
  path: path,
  operation: 'list',
});

setError(permissionError); // Set error state for the component to handle
onDenied?.(permissionError);
errorEmitter.emit('permission-error', permissionError); // Also emit for global listeners
return; // Stop further execution
        }

console.error(`Unhandled error fetching collection:`, err);
setError(err);
      }
    );

return () => unsubscribe();
  }, [query, debugPath, onDenied]);

return { data, isLoading, error };
}
