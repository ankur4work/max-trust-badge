FROM node:18-alpine

ARG SHOPIFY_API_KEY
ENV SHOPIFY_API_KEY=$SHOPIFY_API_KEY
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

WORKDIR /app
COPY web .
RUN npm install
RUN cd frontend && npm install && npm run build

HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["npm", "run", "serve"]
