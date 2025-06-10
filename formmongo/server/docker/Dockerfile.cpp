FROM gcc:11.2.0
WORKDIR /app
RUN useradd -ms /bin/bash coderunner
USER coderunner
CMD ["bash"]