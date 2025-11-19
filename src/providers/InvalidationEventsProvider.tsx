import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, type ReactNode } from 'react';
import { useStudio } from './StudioProvider';
import { eventBus } from '../services';
import { SseClientEvents } from '../events';

export function InvalidationEventsProvider({ children }: { children: ReactNode }) {
  const { environment } = useStudio();
  const queryClient = useQueryClient();
  const workflowTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const documentTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!environment.id) return;

    const envKey = environment.id;
    console.log('Setting up InvalidationEventsProvider for environment:', envKey);
    const unsubWorkflowCreatedSubscriber = eventBus.on(
      SseClientEvents.WORKFLOW_CREATED,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (payload: any) => {
        if (workflowTimeoutRef.current) {
          clearTimeout(workflowTimeoutRef.current);
        }
        workflowTimeoutRef.current = setTimeout(() => {
          if (payload.namespaceId) {
            queryClient.invalidateQueries({
              queryKey: ['workflows', payload.namespaceId, envKey]
            });
            queryClient.invalidateQueries({
              queryKey: ['namespaces', payload.pipelineId, envKey]
            });
            queryClient.invalidateQueries({
              queryKey: ['workflows', payload.namespaceId, envKey]
            });
          }

          if (payload.pipelineId) {
            queryClient.invalidateQueries({
              queryKey: ['workflows-by-pipeline', payload.pipelineId, envKey]
            });
          }
        }, 300);
      }
    );
    
    const unsubWorkflowUpdatedSubscriber = eventBus.on(
      SseClientEvents.WORKFLOW_UPDATED,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (payload: any) => {
        if (workflowTimeoutRef.current) {
          clearTimeout(workflowTimeoutRef.current);
        }
        workflowTimeoutRef.current = setTimeout(() => {
          if (payload.id) {
            queryClient.invalidateQueries({ queryKey: ['workflow', payload.id, envKey] });
            queryClient.invalidateQueries({
              queryKey: ['namespaces', payload.pipelineId, envKey]
            });
            queryClient.invalidateQueries({
              queryKey: ['workflows', payload.namespaceId, envKey]
            });
          }
        }, 300);
      }
    );

    const unsubDocumentCreatedSubscriber = eventBus.on(
      SseClientEvents.DOCUMENT_CREATED,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (payload: any) => {
        if (documentTimeoutRef.current) {
          clearTimeout(documentTimeoutRef.current);
        }
        documentTimeoutRef.current = setTimeout(() => {
          if (payload.workflowId) {
            queryClient.invalidateQueries({ queryKey: ['documents', payload.workflowId, envKey] });
          }
        }, 300);
      }
    );

    return () => {
      unsubWorkflowCreatedSubscriber();
      unsubWorkflowUpdatedSubscriber();
      unsubDocumentCreatedSubscriber();
      if (workflowTimeoutRef.current) {
        clearTimeout(workflowTimeoutRef.current);
      }
      if (documentTimeoutRef.current) {
        clearTimeout(documentTimeoutRef.current);
      }
    };
  }, [queryClient, environment.id]);

  return <>{children}</>;
}
