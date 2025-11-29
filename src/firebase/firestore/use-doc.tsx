          });

setError(permissionError);
errorEmitter.emit('permission-error', permissionError);
return;
        }

console.error(`Unhandled error fetching doc: ${ref.path}`, err);
setError(err);
      }
    );

return () => unsubscribe();
  }, [ref]);

return { data, isLoading, error };
}
